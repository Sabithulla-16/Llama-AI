from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Tuple

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from .supabase_client import (
    build_filter_params,
    build_order_param,
    fetch_user,
    postgrest_request,
)

router = APIRouter(prefix='/api/data')


class QueryFilter(BaseModel):
    column: str
    op: str
    value: Any


class QueryOrder(BaseModel):
    column: str
    ascending: bool = True
    nulls_first: Optional[bool] = None


class DbQuery(BaseModel):
    table: Literal['conversations', 'messages', 'user_settings']
    action: Literal['select', 'insert', 'update', 'delete', 'upsert']
    select: Optional[str] = None
    data: Optional[Any] = None
    filters: List[QueryFilter] = Field(default_factory=list)
    order: List[QueryOrder] = Field(default_factory=list)
    range: Optional[Tuple[int, int]] = None
    single: bool = False
    maybe_single: bool = False
    on_conflict: Optional[str] = None


class AuthContext(BaseModel):
    user: Dict[str, Any]
    access_token: str


async def require_user(authorization: Optional[str] = Header(None)) -> AuthContext:
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing authorization token.')
    token = authorization.split(' ', 1)[1].strip()
    user = await fetch_user(token)
    return AuthContext(user=user, access_token=token)


def _extract_filter_values(filters: List[QueryFilter], column: str) -> List[Any]:
    values: List[Any] = []
    for item in filters:
        if item.column != column:
            continue
        if item.op == 'eq':
            values.append(item.value)
        elif item.op == 'in' and isinstance(item.value, list):
            values.extend(item.value)
    return values


async def _ensure_conversation_access(user_id: str, conversation_ids: List[str]) -> None:
    if not conversation_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Missing conversation id filter.')
    params = {
        'select': 'id',
        'user_id': f"eq.{user_id}",
        'id': f"in.({','.join(conversation_ids)})",
    }
    response = await postgrest_request('GET', 'conversations', params=params)
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    rows = response.json()
    if len(rows) != len(set(conversation_ids)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Conversation access denied.')


async def _resolve_message_conversations(message_ids: List[str]) -> List[str]:
    params = {
        'select': 'conversation_id',
        'id': f"in.({','.join(message_ids)})",
    }
    response = await postgrest_request('GET', 'messages', params=params)
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    rows = response.json()
    return [row.get('conversation_id') for row in rows if row.get('conversation_id')]


def _apply_user_filter(filters: List[QueryFilter], user_id: str) -> None:
    filters.append(QueryFilter(column='user_id', op='eq', value=user_id))


def _sanitize_insert_payload(payload: Any, user_id: str) -> Any:
    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict):
                item['user_id'] = user_id
        return payload
    if isinstance(payload, dict):
        payload['user_id'] = user_id
    return payload


@router.post('/query')
async def run_query(payload: DbQuery, auth: AuthContext = Depends(require_user)) -> Dict[str, Any]:
    user_id = auth.user.get('id')
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid session user.')

    filters = list(payload.filters)

    if payload.table in ('conversations', 'user_settings'):
        if payload.action in ('select', 'update', 'delete'):
            _apply_user_filter(filters, user_id)
        if payload.action in ('insert', 'upsert'):
            payload.data = _sanitize_insert_payload(payload.data, user_id)

    if payload.table == 'messages':
        conversation_ids = _extract_filter_values(filters, 'conversation_id')
        if payload.action == 'insert':
            data_items = payload.data if isinstance(payload.data, list) else [payload.data]
            conversation_ids = [
                item.get('conversation_id') for item in data_items if isinstance(item, dict)
            ]
        if not conversation_ids:
            message_ids = _extract_filter_values(filters, 'id')
            if message_ids:
                conversation_ids = await _resolve_message_conversations(message_ids)
        if conversation_ids:
            await _ensure_conversation_access(user_id, [str(cid) for cid in conversation_ids])
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Conversation scope required.')

    params: Dict[str, Any] = {}
    if payload.select:
        params['select'] = payload.select

    filter_params = build_filter_params([item.dict() for item in filters])
    params.update(filter_params)

    order_value = build_order_param([item.dict() for item in payload.order])
    if order_value:
        params['order'] = order_value

    if payload.range:
        start, end = payload.range
        if end >= start:
            params['offset'] = start
            params['limit'] = end - start + 1

    prefer = None
    if payload.action in ('insert', 'update', 'upsert') and payload.select:
        prefer = 'return=representation'
    elif payload.action in ('insert', 'update', 'upsert'):
        prefer = 'return=minimal'

    if payload.action == 'upsert' and payload.on_conflict:
        prefer = (prefer + ',') if prefer else ''
        prefer += 'resolution=merge-duplicates'
        params['on_conflict'] = payload.on_conflict

    method_map = {
        'select': 'GET',
        'insert': 'POST',
        'update': 'PATCH',
        'delete': 'DELETE',
        'upsert': 'POST',
    }

    method = method_map[payload.action]
    response = await postgrest_request(method, payload.table, params=params, payload=payload.data, prefer=prefer)

    if response.status_code >= 400:
        return {'data': None, 'error': {'message': response.text}}

    data = response.json() if response.content else None

    if payload.single:
        if isinstance(data, list):
            if len(data) != 1:
                return {'data': None, 'error': {'message': 'Expected single row.'}}
            data = data[0]
    elif payload.maybe_single:
        if isinstance(data, list):
            if len(data) == 0:
                data = None
            elif len(data) == 1:
                data = data[0]
            else:
                return {'data': None, 'error': {'message': 'Expected at most one row.'}}

    return {'data': data, 'error': None}


@router.get('/shared/{token}')
async def get_shared_conversation(token: str) -> Dict[str, Any]:
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid share token.')

    convo_params = {
        'select': 'id,title',
        'share_token': f"eq.{token}",
        'is_shared': 'eq.true',
        'limit': 1,
    }
    convo_response = await postgrest_request('GET', 'conversations', params=convo_params)
    if convo_response.status_code >= 400:
        raise HTTPException(status_code=convo_response.status_code, detail=convo_response.text)

    convo_rows = convo_response.json()
    if not convo_rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Shared conversation not found.')

    conversation = convo_rows[0]
    messages_params = {
        'select': '*',
        'conversation_id': f"eq.{conversation['id']}",
        'order': 'created_at.asc',
    }
    messages_response = await postgrest_request('GET', 'messages', params=messages_params)
    if messages_response.status_code >= 400:
        raise HTTPException(status_code=messages_response.status_code, detail=messages_response.text)

    return {
        'conversation': conversation,
        'messages': messages_response.json(),
    }
