from __future__ import annotations

from typing import Dict, List, Optional

from .config import (
    HF_CODER_API_BASE,
    HF_FAST_API_BASE,
    HF_IMAGE_GEN_BASE,
    HF_MAIN_API_BASE,
    HF_TITLE_API_BASE,
)
from .models import ModelEndpoint


class ModelRegistry:
    def __init__(self) -> None:
        self._registry: Dict[str, List[ModelEndpoint]] = {}
        self._bootstrap()

    def _bootstrap(self) -> None:
        self._registry = {
            'llama': [
                ModelEndpoint(
                    id='llama',
                    provider='huggingface',
                    base_url=HF_MAIN_API_BASE,
                    chat_path='/v1/chat/llama',
                    stop_path='/v1/stop',
                    feedback_path='/v1/feedback',
                    capabilities=['text'],
                )
            ],
            'qwen': [
                ModelEndpoint(
                    id='qwen',
                    provider='huggingface',
                    base_url=HF_MAIN_API_BASE,
                    chat_path='/v1/chat/qwen',
                    stop_path='/v1/stop',
                    feedback_path='/v1/feedback',
                    capabilities=['text'],
                )
            ],
            'mini': [
                ModelEndpoint(
                    id='mini',
                    provider='huggingface',
                    base_url=HF_MAIN_API_BASE,
                    chat_path='/v1/chat/mini',
                    stop_path='/v1/stop',
                    feedback_path='/v1/feedback',
                    capabilities=['text'],
                )
            ],
            'smart': [
                ModelEndpoint(
                    id='smart',
                    provider='huggingface',
                    base_url=HF_MAIN_API_BASE,
                    chat_path='/v1/chat/smart',
                    stop_path='/v1/stop',
                    feedback_path='/v1/feedback',
                    capabilities=['text'],
                )
            ],
            'coder': [
                ModelEndpoint(
                    id='coder',
                    provider='huggingface',
                    base_url=HF_CODER_API_BASE,
                    chat_path='/v1/chat/stream',
                    stop_path='/v1/stop',
                    feedback_path='/v1/feedback',
                    capabilities=['text'],
                )
            ],
            'fast': [
                ModelEndpoint(
                    id='fast',
                    provider='huggingface',
                    base_url=HF_FAST_API_BASE,
                    chat_path='/v1/chat/stream',
                    stop_path='/v1/stop',
                    feedback_path='/v1/feedback',
                    capabilities=['text', 'fast'],
                )
            ],
            'vision': [
                ModelEndpoint(
                    id='vision',
                    provider='huggingface',
                    base_url=HF_MAIN_API_BASE,
                    image_stream_path='/v1/chat/image/stream',
                    stop_path='/v1/stop',
                    feedback_path='/v1/feedback',
                    supports_vision=True,
                    capabilities=['vision', 'stream'],
                )
            ],
            'image-gen': [
                ModelEndpoint(
                    id='image-gen',
                    provider='huggingface',
                    base_url=HF_IMAGE_GEN_BASE,
                    image_generate_path='/generate',
                    stop_path='/v1/stop',
                    feedback_path='/v1/feedback',
                    supports_image_generation=True,
                    capabilities=['image', 'generation'],
                )
            ],
            'title': [
                ModelEndpoint(
                    id='title',
                    provider='huggingface',
                    base_url=HF_TITLE_API_BASE,
                    title_path='/generate-title',
                    supports_streaming=False,
                    capabilities=['title'],
                )
            ],
        }

    def list_models(self) -> Dict[str, List[ModelEndpoint]]:
        return self._registry

    def get_endpoints(self, model_id: str) -> List[ModelEndpoint]:
        return self._registry.get(model_id, [])

    def pick_endpoint(self, model_id: str) -> Optional[ModelEndpoint]:
        endpoints = self.get_endpoints(model_id)
        if not endpoints:
            return None
        healthy = [endpoint for endpoint in endpoints if endpoint.health.is_available()]
        if healthy:
            return healthy[0]
        return endpoints[0]

    def ordered_endpoints(self, model_id: str) -> List[ModelEndpoint]:
        endpoints = self.get_endpoints(model_id)
        if not endpoints:
            return []
        healthy = [endpoint for endpoint in endpoints if endpoint.health.is_available()]
        unhealthy = [endpoint for endpoint in endpoints if endpoint not in healthy]
        return healthy + unhealthy


registry = ModelRegistry()
