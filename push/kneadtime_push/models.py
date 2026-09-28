from datetime import datetime
from urllib.parse import urlsplit

from pydantic import BaseModel, Field, field_validator

# The hosts a browser's push service can live on. The cluster's network policy
# allows exactly these names, so anything else is refused here rather than
# failing silently at send time.
KNOWN_PUSH_HOSTS = (
    "web.push.apple.com",
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
)
KNOWN_PUSH_HOST_SUFFIXES = (".notify.windows.com",)

MAX_REMINDERS = 16
MAX_TITLE = 120
MAX_BODY = 500


def is_known_push_host(host: str) -> bool:
    return host in KNOWN_PUSH_HOSTS or host.endswith(KNOWN_PUSH_HOST_SUFFIXES)


class PushKeys(BaseModel):
    p256dh: str = Field(min_length=1, max_length=200)
    auth: str = Field(min_length=1, max_length=100)


class Subscription(BaseModel):
    endpoint: str = Field(min_length=1, max_length=2000)
    keys: PushKeys

    @field_validator("endpoint")
    @classmethod
    def known_push_service(cls, value: str) -> str:
        parts = urlsplit(value)
        if parts.scheme != "https" or not is_known_push_host(parts.hostname or ""):
            raise ValueError("endpoint is not a known push service")
        return value


class Reminder(BaseModel):
    # A Web Push Topic: at most 32 URL-safe base64 characters.
    uid: str = Field(pattern=r"^[A-Za-z0-9_-]{1,32}$")
    at: datetime
    title: str = Field(min_length=1, max_length=MAX_TITLE)
    body: str = Field(max_length=MAX_BODY)

    @field_validator("at")
    @classmethod
    def timezone_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("at must carry a timezone")
        return value


class Receipt(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_TITLE)
    body: str = Field(max_length=MAX_BODY)


class SchedulePut(BaseModel):
    subscription: Subscription
    receipt: Receipt | None = None
    reminders: list[Reminder] = Field(max_length=MAX_REMINDERS)
