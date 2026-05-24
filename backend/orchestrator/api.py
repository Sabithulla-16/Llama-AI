from __future__ import annotations

from typing import Any, Dict, List, Optional
import asyncio
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from .providers.huggingface import HuggingFaceProvider, ProviderError
from .registry import registry
from .request_store import request_store
from .security import require_backend_auth
from .streaming import encode_json_event

router = APIRouter(dependencies=[Depends(require_backend_auth)])
provider = HuggingFaceProvider()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatStreamRequest(BaseModel):
    user_id: str
    conversation_id: str
    messages: List[ChatMessage]
    message: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 512
    stream: Optional[bool] = True
    branch: Optional[bool] = False
    parent_id: Optional[str] = None

    class Config:
        extra = 'allow'


class ImageGenerateRequest(BaseModel):
    user_id: str
    conversation_id: str
    prompt: str
    branch: Optional[bool] = False
    parent_id: Optional[str] = None

    class Config:
        extra = 'allow'


class StopRequest(BaseModel):
    conversation_id: Optional[str] = None
    request_id: Optional[str] = None


class FeedbackRequest(BaseModel):
    message_id: str
    feedback: str


class TitleRequest(BaseModel):
    conversation_id: str
    prompt: str


async def _stream_chat(model_id: str, payload: Dict[str, Any]):
    endpoints = registry.ordered_endpoints(model_id)
    if not endpoints:
        raise HTTPException(status_code=404, detail='Unknown model')

    entry = await request_store.create(
        model_id=model_id,
        conversation_id=payload.get('conversation_id'),
        user_id=payload.get('user_id'),
    )
    done_sent = False

    async def _cancel_response(response):
        async def _close():
            await response.aclose()
        await request_store.attach_cancel(entry.request_id, _close)

    async def event_stream():
        nonlocal done_sent
        try:
            yield encode_json_event('start', {
                'request_id': entry.request_id,
                'model': model_id,
            })
            last_error: Optional[Exception] = None
            for endpoint in endpoints:
                try:
                    async for chunk in provider.stream_chat(
                        endpoint,
                        payload,
                        entry.request_id,
                        entry.stop_event,
                        on_response=_cancel_response,
                    ):
                        if '"done": true' in chunk or 'event: done' in chunk:
                            done_sent = True
                        yield chunk
                    last_error = None
                    break
                except ProviderError as exc:
                    last_error = exc
                    continue
            if last_error:
                raise last_error
        except ProviderError as exc:
            yield encode_json_event('error', {
                'error': 'Upstream model error.',
                'request_id': entry.request_id,
                'model': model_id,
            })
        except Exception:
            yield encode_json_event('error', {
                'error': 'Unexpected streaming error.',
                'request_id': entry.request_id,
                'model': model_id,
            })
        finally:
            if not done_sent:
                yield encode_json_event('done', {
                    'done': True,
                    'request_id': entry.request_id,
                    'model': model_id,
                })
            await request_store.mark_done(entry.request_id)

    return StreamingResponse(event_stream(), media_type='text/event-stream')


@router.post('/v1/chat/stream')
async def fast_stream(payload: ChatStreamRequest):
    return await _stream_chat('fast', payload.dict())


@router.post('/v1/chat/{model_id}')
async def chat_stream(model_id: str, payload: ChatStreamRequest):
    return await _stream_chat(model_id, payload.dict())


@router.post('/v1/chat/image/stream')
async def image_stream(
    user_id: str = Form(...),
    conversation_id: str = Form(...),
    prompt: str = Form(...),
    file: UploadFile = File(...),
    branch: bool = Form(False),
    parent_id: Optional[str] = Form(None),
):
    endpoints = registry.ordered_endpoints('vision')
    if not endpoints:
        raise HTTPException(status_code=404, detail='Image stream endpoint unavailable')

    entry = await request_store.create(
        model_id='vision',
        conversation_id=conversation_id,
        user_id=user_id,
    )
    done_sent = False

    async def _cancel_response(response):
        async def _close():
            await response.aclose()
        await request_store.attach_cancel(entry.request_id, _close)

    async def event_stream():
        nonlocal done_sent
        try:
            yield encode_json_event('start', {
                'request_id': entry.request_id,
                'model': 'vision',
            })
            data = {
                'user_id': user_id,
                'conversation_id': conversation_id,
                'prompt': prompt,
                'branch': str(branch).lower(),
            }
            if parent_id:
                data['parent_id'] = parent_id

            files = {'file': (file.filename, await file.read(), file.content_type)}

            last_error: Optional[Exception] = None
            for endpoint in endpoints:
                try:
                    async for chunk in provider.stream_vision(
                        endpoint,
                        data,
                        files,
                        entry.request_id,
                        entry.stop_event,
                        on_response=_cancel_response,
                    ):
                        if '"done": true' in chunk or 'event: done' in chunk:
                            done_sent = True
                        yield chunk
                    last_error = None
                    break
                except ProviderError as exc:
                    last_error = exc
                    continue
            if last_error:
                raise last_error
        except ProviderError:
            yield encode_json_event('error', {
                'error': 'Upstream image stream error.',
                'request_id': entry.request_id,
                'model': 'vision',
            })
        except Exception:
            yield encode_json_event('error', {
                'error': 'Unexpected image stream error.',
                'request_id': entry.request_id,
                'model': 'vision',
            })
        finally:
            if not done_sent:
                yield encode_json_event('done', {
                    'done': True,
                    'request_id': entry.request_id,
                    'model': 'vision',
                })
            await request_store.mark_done(entry.request_id)

    return StreamingResponse(event_stream(), media_type='text/event-stream')


@router.post('/generate')
async def generate_image(payload: ImageGenerateRequest):
    endpoints = registry.ordered_endpoints('image-gen')
    if not endpoints:
        raise HTTPException(status_code=404, detail='Image generation endpoint unavailable')

    try:
        last_error: Optional[Exception] = None
        for endpoint in endpoints:
            try:
                result = await provider.generate_image(endpoint, payload.dict())
                return JSONResponse({'image': result})
            except ProviderError as exc:
                last_error = exc
                continue
        raise last_error or ProviderError('Image generation failed')
    except ProviderError:
        raise HTTPException(status_code=502, detail='Image generation failed')


@router.post('/generate-title')
async def generate_title(payload: TitleRequest):
    endpoints = registry.ordered_endpoints('title')
    if not endpoints:
        raise HTTPException(status_code=404, detail='Title endpoint unavailable')

    try:
        last_error: Optional[Exception] = None
        for endpoint in endpoints:
            try:
                result = await provider.generate_title(endpoint, payload.dict())
                return JSONResponse(result)
            except ProviderError as exc:
                last_error = exc
                continue
        raise last_error or ProviderError('Title generation failed')
    except ProviderError:
        raise HTTPException(status_code=502, detail='Title generation failed')


@router.post('/v1/stop')
async def stop_generation(payload: StopRequest):
    if payload.request_id:
        entry = await request_store.get_entry(payload.request_id)
        if entry:
            endpoint = registry.pick_endpoint(entry.model_id)
            if endpoint:
                try:
                    await provider.post_stop(endpoint, {
                        'conversation_id': entry.conversation_id,
                    })
                except ProviderError:
                    pass
        await request_store.abort_request(payload.request_id)
        return JSONResponse({'status': 'ok'})

    if payload.conversation_id:
        entries = await request_store.get_entries_by_conversation(payload.conversation_id)
        for entry in entries.values():
            endpoint = registry.pick_endpoint(entry.model_id)
            if endpoint:
                try:
                    await provider.post_stop(endpoint, {
                        'conversation_id': payload.conversation_id,
                    })
                except ProviderError:
                    continue
        await request_store.abort_by_conversation(payload.conversation_id)
        return JSONResponse({'status': 'ok'})

    return JSONResponse({'status': 'no_active_request'})


@router.post('/v1/feedback')
async def submit_feedback(payload: FeedbackRequest):
    successes = 0
    for endpoints in registry.list_models().values():
        for endpoint in endpoints:
            if not endpoint.feedback_url():
                continue
            try:
                await provider.post_feedback(endpoint, payload.dict())
                successes += 1
            except ProviderError:
                continue

    if successes == 0:
        raise HTTPException(status_code=502, detail='Unable to save feedback')

    return JSONResponse({'status': 'ok'})


@router.get('/v1/health')
async def health_snapshot():
    snapshot = {}
    for model_id, endpoints in registry.list_models().items():
        snapshot[model_id] = [
            {
                'provider': endpoint.provider,
                'ok': endpoint.health.ok,
                'latency_ms': endpoint.health.latency_ms,
                'last_checked': endpoint.health.last_checked,
                'disabled_until': endpoint.health.disabled_until,
                'last_error': endpoint.health.last_error,
            }
            for endpoint in endpoints
        ]
    return JSONResponse({'status': 'ok', 'models': snapshot})
