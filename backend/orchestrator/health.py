from __future__ import annotations

import asyncio
import time
from typing import Optional

from .config import HEALTH_CHECK_INTERVAL_SECONDS, HEALTH_DISABLE_SECONDS, HEALTH_FAILURE_THRESHOLD
from .registry import registry
from .providers.huggingface import HuggingFaceProvider, ProviderError


class HealthMonitor:
    def __init__(self, provider: Optional[HuggingFaceProvider] = None) -> None:
        self._provider = provider or HuggingFaceProvider()
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

    async def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._stop_event.clear()
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self._stop_event.set()
        if self._task:
            await self._task

    async def _run(self) -> None:
        while not self._stop_event.is_set():
            await self._check_all()
            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=HEALTH_CHECK_INTERVAL_SECONDS)
            except asyncio.TimeoutError:
                continue

    async def _check_all(self) -> None:
        for model_id, endpoints in registry.list_models().items():
            for endpoint in endpoints:
                start = time.time()
                try:
                    await self._provider.ping(endpoint)
                    latency_ms = int((time.time() - start) * 1000)
                    endpoint.health.mark_success(latency_ms)
                except ProviderError as exc:
                    endpoint.health.mark_failure(
                        str(exc),
                        disable_seconds=HEALTH_DISABLE_SECONDS,
                        threshold=HEALTH_FAILURE_THRESHOLD,
                    )
                except Exception as exc:
                    endpoint.health.mark_failure(
                        str(exc),
                        disable_seconds=HEALTH_DISABLE_SECONDS,
                        threshold=HEALTH_FAILURE_THRESHOLD,
                    )


health_monitor = HealthMonitor()
