from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, Optional, Set
import asyncio
import time
import uuid


@dataclass
class RequestEntry:
    request_id: str
    conversation_id: Optional[str]
    model_id: str
    user_id: Optional[str]
    started_at: float
    stop_event: asyncio.Event
    cancel_callback: Optional[Callable[[], asyncio.Future]] = None


class RequestStore:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._entries: Dict[str, RequestEntry] = {}
        self._conversation_index: Dict[str, Set[str]] = {}

    async def create(
        self,
        model_id: str,
        conversation_id: Optional[str],
        user_id: Optional[str] = None,
    ) -> RequestEntry:
        request_id = str(uuid.uuid4())
        entry = RequestEntry(
            request_id=request_id,
            conversation_id=conversation_id,
            model_id=model_id,
            user_id=user_id,
            started_at=time.time(),
            stop_event=asyncio.Event(),
        )
        async with self._lock:
            self._entries[request_id] = entry
            if conversation_id:
                self._conversation_index.setdefault(conversation_id, set()).add(request_id)
        return entry

    async def attach_cancel(self, request_id: str, cancel_callback: Callable[[], asyncio.Future]) -> None:
        async with self._lock:
            entry = self._entries.get(request_id)
            if entry:
                entry.cancel_callback = cancel_callback

    async def mark_done(self, request_id: str) -> None:
        async with self._lock:
            entry = self._entries.pop(request_id, None)
            if entry and entry.conversation_id:
                ids = self._conversation_index.get(entry.conversation_id)
                if ids:
                    ids.discard(request_id)
                    if not ids:
                        self._conversation_index.pop(entry.conversation_id, None)

    async def abort_request(self, request_id: str) -> bool:
        async with self._lock:
            entry = self._entries.get(request_id)
        if not entry:
            return False
        entry.stop_event.set()
        if entry.cancel_callback:
            await entry.cancel_callback()
        await self.mark_done(request_id)
        return True

    async def abort_by_conversation(self, conversation_id: str) -> int:
        async with self._lock:
            request_ids = list(self._conversation_index.get(conversation_id, set()))
        aborted = 0
        for request_id in request_ids:
            if await self.abort_request(request_id):
                aborted += 1
        return aborted

    async def get_entry(self, request_id: str) -> Optional[RequestEntry]:
        async with self._lock:
            return self._entries.get(request_id)

    async def get_entries_by_conversation(self, conversation_id: str) -> Dict[str, RequestEntry]:
        async with self._lock:
            ids = list(self._conversation_index.get(conversation_id, set()))
            return {request_id: self._entries[request_id] for request_id in ids if request_id in self._entries}


request_store = RequestStore()
