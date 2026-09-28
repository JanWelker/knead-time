from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from kneadtime_push.models import (
    KNOWN_PUSH_HOST_SUFFIXES,
    KNOWN_PUSH_HOSTS,
    MAX_REMINDERS,
    Reminder,
    SchedulePut,
    Subscription,
    is_known_push_host,
)

KEYS = {"p256dh": "BPubKey", "auth": "authsecret"}
AT = datetime(2026, 9, 28, 13, 0, tzinfo=UTC)


def reminder(**overrides) -> dict:
    return {"uid": "prep", "at": AT.isoformat(), "title": "Prep", "body": "Weigh it"} | overrides


def test_the_push_service_allow_list_is_the_one_the_network_policy_opens():
    assert KNOWN_PUSH_HOSTS == (
        "web.push.apple.com",
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
    )
    assert KNOWN_PUSH_HOST_SUFFIXES == (".notify.windows.com",)
    assert is_known_push_host("wns2-par02p.notify.windows.com")
    assert not is_known_push_host("notify.windows.com.evil.example")
    assert not is_known_push_host("example.com")


@pytest.mark.parametrize(
    "endpoint",
    [
        "https://example.com/push/abc",
        "http://web.push.apple.com/abc",
        "https://web.push.apple.com.evil.example/abc",
        "",
    ],
)
def test_an_endpoint_off_the_allow_list_is_refused(endpoint):
    with pytest.raises(ValidationError):
        Subscription(endpoint=endpoint, keys=KEYS)


def test_a_known_endpoint_is_accepted():
    sub = Subscription(endpoint="https://web.push.apple.com/QAbc", keys=KEYS)
    assert sub.endpoint == "https://web.push.apple.com/QAbc"


def test_a_naive_timestamp_is_refused():
    with pytest.raises(ValidationError):
        Reminder(**reminder(at="2026-09-28T13:00:00"))


@pytest.mark.parametrize("uid", ["", "a" * 33, "has space", "has/slash", "ü"])
def test_a_uid_must_be_a_valid_push_topic(uid):
    with pytest.raises(ValidationError):
        Reminder(**reminder(uid=uid))


def test_title_and_body_are_bounded():
    with pytest.raises(ValidationError):
        Reminder(**reminder(title="t" * 121))
    with pytest.raises(ValidationError):
        Reminder(**reminder(body="b" * 501))
    with pytest.raises(ValidationError):
        Reminder(**reminder(title=""))
    assert Reminder(**reminder(title="t" * 120, body="b" * 500)).title == "t" * 120


def test_a_schedule_holds_at_most_sixteen_reminders():
    assert MAX_REMINDERS == 16
    sub = {"endpoint": "https://fcm.googleapis.com/fcm/send/x", "keys": KEYS}
    SchedulePut(subscription=sub, reminders=[reminder()] * 16)
    with pytest.raises(ValidationError):
        SchedulePut(subscription=sub, reminders=[reminder()] * 17)
