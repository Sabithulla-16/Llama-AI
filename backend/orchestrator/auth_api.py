from __future__ import annotations

from typing import Any, Dict, Optional
import time

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from .supabase_client import auth_request, create_pkce_pair, fetch_user, _require_supabase_url

router = APIRouter(prefix='/api/auth')


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    email: str
    password: str
    data: Optional[Dict[str, Any]] = None


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class OAuthStartRequest(BaseModel):
    provider: str
    redirect_to: str
    scopes: Optional[str] = None


class OAuthExchangeRequest(BaseModel):
    code: str
    code_verifier: str


class SessionResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None
    expires_at: Optional[int] = None
    user: Dict[str, Any]


def _normalize_session(payload: Dict[str, Any]) -> SessionResponse:
    access_token = payload.get('access_token')
    refresh_token = payload.get('refresh_token')
    expires_in = payload.get('expires_in')
    user = payload.get('user')
    if not access_token or not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid session response.')
    expires_at = None
    if isinstance(expires_in, (int, float)):
        expires_at = int(time.time()) + int(expires_in)
    return SessionResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        expires_at=expires_at,
        user=user,
    )


@router.post('/sign-in')
async def sign_in(payload: LoginRequest) -> SessionResponse:
    data = await auth_request(
        'POST',
        '/auth/v1/token',
        params={'grant_type': 'password'},
        payload={
            'email': payload.email,
            'password': payload.password,
        },
    )
    return _normalize_session(data)


@router.post('/sign-up')
async def sign_up(payload: SignupRequest) -> SessionResponse:
    data = await auth_request(
        'POST',
        '/auth/v1/signup',
        payload={
            'email': payload.email,
            'password': payload.password,
            'data': payload.data or {},
        },
    )
    return _normalize_session(data)


@router.post('/refresh')
async def refresh_session(payload: RefreshRequest) -> SessionResponse:
    data = await auth_request(
        'POST',
        '/auth/v1/token',
        params={'grant_type': 'refresh_token'},
        payload={'refresh_token': payload.refresh_token},
    )
    return _normalize_session(data)


@router.post('/oauth/start')
async def oauth_start(payload: OAuthStartRequest) -> Dict[str, str]:
    verifier, challenge = create_pkce_pair()
    base_url = _require_supabase_url()
    scopes = f"&scopes={payload.scopes}" if payload.scopes else ''
    auth_url = (
        f"{base_url}/auth/v1/authorize?provider={payload.provider}"
        f"&redirect_to={payload.redirect_to}"
        f"&code_challenge={challenge}"
        f"&code_challenge_method=S256"
        f"{scopes}"
    )
    return {
        'url': auth_url,
        'code_verifier': verifier,
    }


@router.post('/oauth/exchange')
async def oauth_exchange(payload: OAuthExchangeRequest) -> SessionResponse:
    data = await auth_request(
        'POST',
        '/auth/v1/token',
        params={'grant_type': 'pkce'},
        payload={
            'code': payload.code,
            'code_verifier': payload.code_verifier,
        },
    )
    return _normalize_session(data)


@router.get('/session')
async def get_session(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    access_token = None
    if authorization and authorization.lower().startswith('bearer '):
        access_token = authorization.split(' ', 1)[1].strip()
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing access token.')
    user = await fetch_user(access_token)
    return {'user': user}


@router.post('/sign-out')
async def sign_out(authorization: Optional[str] = Header(None)) -> Dict[str, str]:
    access_token = None
    if authorization and authorization.lower().startswith('bearer '):
        access_token = authorization.split(' ', 1)[1].strip()
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing access token.')
    await auth_request('POST', '/auth/v1/logout', access_token=access_token)
    return {'status': 'ok'}
