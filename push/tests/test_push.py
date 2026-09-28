import json

import pytest
from py_vapid import Vapid
from pywebpush import WebPushException

from kneadtime_push import push
from kneadtime_push.config import Settings, public_key_of
from kneadtime_push.models import MAX_BODY, MAX_TITLE
from kneadtime_push.push import GONE_STATUSES, TTL_SECONDS, Gone, SendFailed, Target, make_sender


class Response:
    def __init__(self, status_code: int) -> None:
        self.status_code = status_code


@pytest.fixture
def settings() -> Settings:
    vapid = Vapid()
    vapid.generate_keys()
    return Settings(
        database_url="",
        vapid=vapid,
        vapid_public_key=public_key_of(vapid),
        vapid_subject="https://kneadtime.pizza",
        allowed_origins=(),
    )


TARGET = Target("https://web.push.apple.com/abc", "p256", "auth")


async def test_a_send_carries_the_topic_ttl_urgency_and_a_compact_payload(settings, monkeypatch):
    seen = {}

    def fake_webpush(subscription_info, **kwargs):
        seen["info"] = subscription_info
        seen.update(kwargs)

    monkeypatch.setattr(push, "webpush", fake_webpush)
    await make_sender(settings)(TARGET, {"title": "Prep", "body": "Weigh ü"}, "prep")
    assert seen["info"] == {
        "endpoint": "https://web.push.apple.com/abc",
        "keys": {"p256dh": "p256", "auth": "auth"},
    }
    assert seen["data"] == '{"title":"Prep","body":"Weigh ü"}'
    assert seen["ttl"] == TTL_SECONDS == 1800
    assert seen["headers"] == {"Topic": "prep", "Urgency": "high"}
    assert seen["vapid_claims"] == {"sub": "https://kneadtime.pizza"}
    assert seen["vapid_private_key"] is settings.vapid
    assert seen["timeout"] == 10


def test_the_statuses_that_retire_a_subscription_include_a_rotated_key():
    assert {401, 403, 404, 410} == GONE_STATUSES


@pytest.mark.parametrize("status", sorted(GONE_STATUSES))
async def test_a_refused_subscription_raises_gone(settings, monkeypatch, status):
    def fake_webpush(*_, **__):
        raise WebPushException("nope", response=Response(status))

    monkeypatch.setattr(push, "webpush", fake_webpush)
    with pytest.raises(Gone):
        await make_sender(settings)(TARGET, {}, "t")


@pytest.mark.parametrize("status", [500, 429, None])
async def test_any_other_failure_is_retried(settings, monkeypatch, status):
    def fake_webpush(*_, **__):
        raise WebPushException("nope", response=Response(status) if status else None)

    monkeypatch.setattr(push, "webpush", fake_webpush)
    with pytest.raises(SendFailed):
        await make_sender(settings)(TARGET, {}, "t")


async def test_a_network_error_is_retried(settings, monkeypatch):
    def fake_webpush(*_, **__):
        raise OSError("connection reset")

    monkeypatch.setattr(push, "webpush", fake_webpush)
    with pytest.raises(SendFailed):
        await make_sender(settings)(TARGET, {}, "t")


def test_the_largest_payload_stays_under_apples_four_kilobytes():
    payload = {"title": "ü" * MAX_TITLE, "body": "ü" * MAX_BODY, "tag": "a" * 32}
    wire = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
    assert len(wire) < 3800
