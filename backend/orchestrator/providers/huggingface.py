from __future__ import annotations

from typing import Any, AsyncIterator, Dict, Optional
import asyncio
import httpx

from ..config import HF_API_TOKEN, REQUEST_TIMEOUT_SECONDS, STREAM_TIMEOUT_SECONDS
from ..models import ModelEndpoint
from ..streaming import normalize_provider_event, parse_sse


class ProviderError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class HuggingFaceProvider:
    def __init__(self) -> None:
        self._base_headers = {}
        if HF_API_TOKEN:
            self._base_headers['Authorization'] = f"Bearer {HF_API_TOKEN}"

    async def _raise_for_status(self, response: httpx.Response, context: str) -> None:
        if response.status_code < 400:
            return
        message = f"{context} failed with HTTP {response.status_code}."
        raise ProviderError(message, status_code=response.status_code)

    async def stream_chat(
        self,
        endpoint: ModelEndpoint,
        payload: Dict[str, Any],
        request_id: str,
        stop_event: asyncio.Event,
        on_response: Optional[callable] = None,
    ) -> AsyncIterator[str]:
        url = endpoint.chat_url()
        if not url:
            raise ProviderError('Chat endpoint not configured.')

        timeout = httpx.Timeout(STREAM_TIMEOUT_SECONDS, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout, headers=self._base_headers) as client:
            async with client.stream(
                'POST',
                url,
                headers={'Accept': 'text/event-stream'},
                json=payload,
            ) as response:
                await self._raise_for_status(response, 'Chat stream')
                if on_response:
                    await on_response(response)

                async for event in parse_sse(response.aiter_lines()):
                    if stop_event.is_set():
                        break
                    for chunk in normalize_provider_event(event, request_id, endpoint.id):
                        yield chunk

    async def stream_vision(
        self,
        endpoint: ModelEndpoint,
        data: Dict[str, Any],
        files: Dict[str, Any],
        request_id: str,
        stop_event: asyncio.Event,
        on_response: Optional[callable] = None,
    ) -> AsyncIterator[str]:
        url = endpoint.image_stream_url()
        if not url:
            raise ProviderError('Image stream endpoint not configured.')

        timeout = httpx.Timeout(STREAM_TIMEOUT_SECONDS, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout, headers=self._base_headers) as client:
            async with client.stream(
                'POST',
                url,
                headers={'Accept': 'text/event-stream'},
                data=data,
                files=files,
            ) as response:
                await self._raise_for_status(response, 'Image stream')
                if on_response:
                    await on_response(response)

                async for event in parse_sse(response.aiter_lines()):
                    if stop_event.is_set():
                        break
                    for chunk in normalize_provider_event(event, request_id, endpoint.id):
                        yield chunk

    async def generate_image(
        self,
        endpoint: ModelEndpoint,
        payload: Dict[str, Any],
    ) -> str:
        url = endpoint.image_generate_url()
        if not url:
            raise ProviderError('Image generation endpoint not configured.')

        timeout = httpx.Timeout(REQUEST_TIMEOUT_SECONDS, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout, headers=self._base_headers) as client:
            response = await client.post(url, json=payload)
            await self._raise_for_status(response, 'Image generation')
            data = response.json()

        return self._extract_image_base64(data)

    async def generate_title(self, endpoint: ModelEndpoint, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = endpoint.title_url()
        if not url:
            raise ProviderError('Title endpoint not configured.')
        timeout = httpx.Timeout(REQUEST_TIMEOUT_SECONDS, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout, headers=self._base_headers) as client:
            response = await client.post(url, json=payload)
            await self._raise_for_status(response, 'Title generation')
            return response.json()

    async def post_stop(self, endpoint: ModelEndpoint, payload: Dict[str, Any]) -> None:
        url = endpoint.stop_url()
        if not url:
            return
        timeout = httpx.Timeout(REQUEST_TIMEOUT_SECONDS, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout, headers=self._base_headers) as client:
            response = await client.post(url, json=payload)
            if response.status_code >= 400:
                raise ProviderError('Stop request failed.', status_code=response.status_code)

    async def post_feedback(self, endpoint: ModelEndpoint, payload: Dict[str, Any]) -> None:
        url = endpoint.feedback_url()
        if not url:
            return
        timeout = httpx.Timeout(REQUEST_TIMEOUT_SECONDS, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout, headers=self._base_headers) as client:
            response = await client.post(url, json=payload)
            if response.status_code >= 400:
                raise ProviderError('Feedback request failed.', status_code=response.status_code)

    async def ping(self, endpoint: ModelEndpoint) -> int:
        url = endpoint.base_url
        timeout = httpx.Timeout(10.0, connect=5.0)
        async with httpx.AsyncClient(timeout=timeout, headers=self._base_headers) as client:
            response = await client.get(url)
            if response.status_code >= 500:
                raise ProviderError('Health check failed.', status_code=response.status_code)
            return response.status_code

    def _extract_image_base64(self, payload: Any) -> str:
        if isinstance(payload, dict):
            for key in ('image', 'data', 'base64', 'b64_json'):
                value = payload.get(key)
                if isinstance(value, str):
                    return value
            images = payload.get('images') or payload.get('outputs')
            if isinstance(images, list) and images:
                if isinstance(images[0], str):
                    return images[0]
            if 'output' in payload and isinstance(payload['output'], str):
                return payload['output']
        raise ProviderError('Image generation response did not include image data.')
