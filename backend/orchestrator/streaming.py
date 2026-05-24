from __future__ import annotations

from dataclasses import dataclass
from typing import AsyncIterator, Iterable, Optional
import json


@dataclass
class SSEEvent:
    event: str
    data: str


def encode_sse(event: Optional[str], data: str) -> str:
    payload = ''
    if event:
        payload += f"event: {event}\n"
    payload += f"data: {data}\n\n"
    return payload


def encode_json_event(event: Optional[str], payload: dict) -> str:
    return encode_sse(event, json.dumps(payload))


def extract_token(payload: dict) -> Optional[str]:
    if not isinstance(payload, dict):
        return None
    choices = payload.get('choices')
    if isinstance(choices, list) and choices:
        delta = choices[0].get('delta') if isinstance(choices[0], dict) else None
        if isinstance(delta, dict):
            token = delta.get('content')
            if isinstance(token, str):
                return token
    for key in ('token', 'text', 'content'):
        token = payload.get(key)
        if isinstance(token, str):
            return token
    return None


def normalize_provider_event(
    event: SSEEvent,
    request_id: str,
    model_id: str,
) -> Iterable[str]:
    data = (event.data or '').strip()
    if not data:
        return []

    if data == '[DONE]':
        return [encode_json_event('done', {'done': True, 'request_id': request_id, 'model': model_id})]

    try:
        parsed = json.loads(data)
    except json.JSONDecodeError:
        token = data
        return [
            encode_json_event(
                None,
                {'choices': [{'delta': {'content': token}}]},
            )
        ]

    if isinstance(parsed, dict):
        if event.event == 'vision_done' or parsed.get('event') == 'vision_done':
            return [encode_json_event('vision_done', {'status': 'done'})]

        if parsed.get('error'):
            return [
                encode_json_event(
                    'error',
                    {
                        'error': parsed.get('error'),
                        'request_id': request_id,
                        'model': model_id,
                    },
                )
            ]

        if parsed.get('done') is True:
            return [encode_json_event('done', {'done': True, 'request_id': request_id, 'model': model_id})]

        token = extract_token(parsed)
        if token:
            return [
                encode_json_event(
                    None,
                    {'choices': [{'delta': {'content': token}}]},
                )
            ]

        return [encode_json_event('metadata', {'request_id': request_id, 'model': model_id, **parsed})]

    return []


async def parse_sse(aiter_lines: AsyncIterator[str]) -> AsyncIterator[SSEEvent]:
    event_name = 'message'
    data_lines = []

    async for line in aiter_lines:
        if line == '':
            if data_lines:
                yield SSEEvent(event=event_name, data='\n'.join(data_lines))
                data_lines = []
                event_name = 'message'
            continue

        if line.startswith(':'):
            continue

        if line.startswith('event:'):
            event_name = line[len('event:') :].strip() or 'message'
            continue

        if line.startswith('data:'):
            data_lines.append(line[len('data:') :].lstrip())
            continue

    if data_lines:
        yield SSEEvent(event=event_name, data='\n'.join(data_lines))
