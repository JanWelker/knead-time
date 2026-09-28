import asyncio
import json
from collections.abc import Awaitable, Callable

from pywebpush import WebPushException, webpush

from .config import Settings

TTL_SECONDS = 1800

# 401/403 are what the push services answer once the VAPID key has been
# rotated: the subscription can never be reached with this key again.
GONE_STATUSES = frozenset({401, 403, 404, 410})


class Gone(Exception):
    """The push service no longer accepts this subscription; delete it."""


class SendFailed(Exception):
    """A transient failure; the dispatcher retries."""


class Target:
    def __init__(self, endpoint: str, p256dh: str, auth: str) -> None:
        self.endpoint = endpoint
        self.p256dh = p256dh
        self.auth = auth

    def subscription_info(self) -> dict:
        return {"endpoint": self.endpoint, "keys": {"p256dh": self.p256dh, "auth": self.auth}}


Sender = Callable[[Target, dict, str], Awaitable[None]]


def make_sender(settings: Settings) -> Sender:
    async def send(target: Target, payload: dict, topic: str) -> None:
        await asyncio.to_thread(_send_blocking, settings, target, payload, topic)

    return send


def _send_blocking(settings: Settings, target: Target, payload: dict, topic: str) -> None:
    try:
        webpush(
            target.subscription_info(),
            data=json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            vapid_private_key=settings.vapid,
            vapid_claims={"sub": settings.vapid_subject},
            ttl=TTL_SECONDS,
            headers={"Topic": topic, "Urgency": "high"},
            timeout=10,
        )
    except WebPushException as exc:
        status = exc.response.status_code if exc.response is not None else None
        if status in GONE_STATUSES:
            raise Gone(str(status)) from exc
        raise SendFailed(str(status or exc)) from exc
    except OSError as exc:
        raise SendFailed(str(exc)) from exc
