from __future__ import annotations

import os
from typing import Optional

from fastapi import Header, HTTPException, status

BACKEND_API_KEY = os.getenv('BACKEND_API_KEY')


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(' ', 1)
    if len(parts) == 2 and parts[0].lower() == 'bearer':
        return parts[1].strip()
    return None


async def require_backend_auth(
    x_backend_token: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
) -> None:
    if not BACKEND_API_KEY:
        return
    token = x_backend_token or _extract_bearer(authorization)
    if token != BACKEND_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Unauthorized',
        )
