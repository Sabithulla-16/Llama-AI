from __future__ import annotations

import base64
import hashlib
import os
import secrets
from typing import Any, Dict, Iterable, List, Optional, Tuple

import httpx
from fastapi import HTTPException, status

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')


def _require_supabase_url() -> str:
    if not SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Supabase is not configured on the backend.',
        )
    return SUPABASE_URL


def _require_anon_key() -> str:
    if not SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Supabase anon key is missing on the backend.',
        )
    return SUPABASE_ANON_KEY


def _require_service_role_key() -> str:
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Supabase service role key is missing on the backend.',
        )
    return SUPABASE_SERVICE_ROLE_KEY


def _base_headers(api_key: str, access_token: Optional[str] = None) -> Dict[str, str]:
    headers = {
        'apikey': api_key,
        'Content-Type': 'application/json',
    }
    if access_token:
        headers['Authorization'] = f'Bearer {access_token}'
    return headers


async def _request(
    method: str,
    url: str,
    headers: Dict[str, str],
    params: Optional[Dict[str, Any]] = None,
    payload: Optional[Any] = None,
) -> httpx.Response:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(
            method,
            url,
            headers=headers,
            params=params,
            json=payload,
        )
    return response


def _raise_for_status(response: httpx.Response) -> None:
    if response.status_code < 400:
        return
    detail = None
    try:
        detail = response.json()
    except Exception:
        detail = response.text
    raise HTTPException(status_code=response.status_code, detail=detail)


async def auth_request(
    method: str,
    path: str,
    payload: Optional[Any] = None,
    access_token: Optional[str] = None,
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    base_url = _require_supabase_url()
    anon_key = _require_anon_key()
    url = f"{base_url}{path}"
    headers = _base_headers(anon_key, access_token=access_token)
    response = await _request(method, url, headers=headers, params=params, payload=payload)
    _raise_for_status(response)
    return response.json()


async def postgrest_request(
    method: str,
    table: str,
    params: Optional[Dict[str, Any]] = None,
    payload: Optional[Any] = None,
    prefer: Optional[str] = None,
) -> httpx.Response:
    base_url = _require_supabase_url()
    service_role = _require_service_role_key()
    url = f"{base_url}/rest/v1/{table}"
    headers = _base_headers(service_role, access_token=service_role)
    if prefer:
        headers['Prefer'] = prefer
    response = await _request(method, url, headers=headers, params=params, payload=payload)
    return response


def create_pkce_pair() -> Tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    hashed = hashlib.sha256(verifier.encode('utf-8')).digest()
    challenge = base64.urlsafe_b64encode(hashed).rstrip(b'=').decode('utf-8')
    return verifier, challenge


async def fetch_user(access_token: str) -> Dict[str, Any]:
    payload = await auth_request(
        'GET',
        '/auth/v1/user',
        access_token=access_token,
    )
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid Supabase session.',
        )
    return payload


def build_order_param(orders: Iterable[Dict[str, Any]]) -> Optional[str]:
    parts: List[str] = []
    for order in orders:
        column = order.get('column')
        if not column:
            continue
        ascending = order.get('ascending', True)
        nulls_first = order.get('nulls_first')
        direction = 'asc' if ascending else 'desc'
        suffix = ''
        if nulls_first is True:
            suffix = '.nullsfirst'
        elif nulls_first is False:
            suffix = '.nullslast'
        parts.append(f"{column}.{direction}{suffix}")
    return ','.join(parts) if parts else None


def build_filter_params(filters: Iterable[Dict[str, Any]]) -> Dict[str, str]:
    params: Dict[str, str] = {}
    for item in filters:
        column = item.get('column')
        op = item.get('op')
        value = item.get('value')
        if not column or not op:
            continue
        if op == 'in' and isinstance(value, list):
            serialized = ','.join(str(v) for v in value)
            params[column] = f"in.({serialized})"
        else:
            params[column] = f"{op}.{value}"
    return params
