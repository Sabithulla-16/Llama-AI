from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional
import time


@dataclass
class HealthStatus:
    ok: bool = True
    last_checked: Optional[float] = None
    latency_ms: Optional[int] = None
    failure_count: int = 0
    disabled_until: Optional[float] = None
    last_error: Optional[str] = None

    def mark_success(self, latency_ms: Optional[int] = None) -> None:
        self.ok = True
        self.last_checked = time.time()
        self.latency_ms = latency_ms
        self.failure_count = 0
        self.disabled_until = None
        self.last_error = None

    def mark_failure(self, error: str, disable_seconds: int, threshold: int) -> None:
        self.last_checked = time.time()
        self.failure_count += 1
        self.last_error = error
        if self.failure_count >= threshold:
            self.ok = False
            self.disabled_until = time.time() + disable_seconds

    def is_available(self) -> bool:
        if self.disabled_until and self.disabled_until > time.time():
            return False
        return self.ok


@dataclass
class ModelEndpoint:
    id: str
    provider: str
    base_url: str
    chat_path: Optional[str] = None
    image_stream_path: Optional[str] = None
    image_generate_path: Optional[str] = None
    stop_path: Optional[str] = None
    feedback_path: Optional[str] = None
    title_path: Optional[str] = None
    supports_streaming: bool = True
    supports_vision: bool = False
    supports_image_generation: bool = False
    capabilities: List[str] = field(default_factory=list)
    health: HealthStatus = field(default_factory=HealthStatus)

    def _join(self, path: Optional[str]) -> Optional[str]:
        if not path:
            return None
        base = self.base_url.rstrip('/')
        if path.startswith('http'):
            return path
        return f"{base}{path}"

    def chat_url(self) -> Optional[str]:
        return self._join(self.chat_path)

    def image_stream_url(self) -> Optional[str]:
        return self._join(self.image_stream_path)

    def image_generate_url(self) -> Optional[str]:
        return self._join(self.image_generate_path)

    def stop_url(self) -> Optional[str]:
        return self._join(self.stop_path)

    def feedback_url(self) -> Optional[str]:
        return self._join(self.feedback_path)

    def title_url(self) -> Optional[str]:
        return self._join(self.title_path)
