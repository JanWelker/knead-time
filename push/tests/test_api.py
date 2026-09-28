import base64
from datetime import timedelta

from kneadtime_push import app as app_module
from kneadtime_push.push import Gone, SendFailed

from .conftest import NOW, count

ENDPOINT = "https://web.push.apple.com/QAbc123"
SUBSCRIPTION = {"endpoint": ENDPOINT, "keys": {"p256dh": "BPub", "auth": "sec"}}


def schedule(*offsets_minutes: int, receipt=True) -> dict:
    return {
        "subscription": {"endpoint": ENDPOINT, "keys": dict(SUBSCRIPTION["keys"])},
        "receipt": {"title": "Reminders set", "body": "3 steps"} if receipt else None,
        "reminders": [
            {
                "uid": f"step-{i}",
                "at": (NOW + timedelta(minutes=m)).isoformat(),
                "title": f"Step {i}",
                "body": f"Do step {i}",
            }
            for i, m in enumerate(offsets_minutes)
        ],
    }


async def test_the_vapid_key_is_the_applicationServerKey(client, settings):
    res = await client.get("/v1/vapid")
    assert res.status_code == 200
    key = res.json()["publicKey"]
    assert key == settings.vapid_public_key
    raw = base64.urlsafe_b64decode(key + "=" * (-len(key) % 4))
    assert len(raw) == 65


async def test_putting_a_schedule_stores_it_and_sends_the_receipt(client, pool, sender):
    res = await client.put("/v1/schedules", json=schedule(30, 90, 240))
    assert res.status_code == 200
    assert res.json() == {"scheduled": 3, "dropped": 0, "receipt": True}
    assert await count(pool, "subscriptions") == 1
    assert await count(pool, "reminders") == 3
    (target, payload, topic) = sender.calls[0]
    assert target.endpoint == ENDPOINT
    assert payload == {"title": "Reminders set", "body": "3 steps", "tag": "receipt"}
    assert topic == "receipt"


async def test_a_second_put_replaces_the_schedule_rather_than_adding_to_it(client, pool):
    await client.put("/v1/schedules", json=schedule(30, 90, 240))
    res = await client.put("/v1/schedules", json=schedule(60))
    assert res.json()["scheduled"] == 1
    assert await count(pool, "subscriptions") == 1
    assert await count(pool, "reminders") == 1


async def test_reminders_already_in_the_past_are_dropped_not_sent(client, pool, sender):
    res = await client.put("/v1/schedules", json=schedule(-5, 0, 30, receipt=False))
    assert res.json() == {"scheduled": 2, "dropped": 1, "receipt": False}
    assert await count(pool, "reminders") == 2
    assert sender.calls == []


async def test_a_reminder_beyond_fourteen_days_is_refused(client, pool):
    res = await client.put("/v1/schedules", json=schedule(14 * 24 * 60 + 1))
    assert res.status_code == 422
    assert await count(pool, "subscriptions") == 0
    ok = await client.put("/v1/schedules", json=schedule(14 * 24 * 60))
    assert ok.status_code == 200


async def test_an_unknown_push_host_is_refused(client, pool):
    body = schedule(30)
    body["subscription"]["endpoint"] = "https://example.com/push"
    res = await client.put("/v1/schedules", json=body)
    assert res.status_code == 422
    assert await count(pool, "subscriptions") == 0


async def test_an_oversized_body_is_refused_before_parsing(client):
    res = await client.put(
        "/v1/schedules",
        content=b"x" * (app_module.MAX_BODY_BYTES + 1),
        headers={"content-type": "application/json"},
    )
    assert res.status_code == 413


async def test_a_refused_receipt_deletes_the_subscription_and_says_so(client, pool, sender):
    sender.fail_with = Gone("410")
    res = await client.put("/v1/schedules", json=schedule(30))
    assert res.status_code == 410
    assert await count(pool, "subscriptions") == 0


async def test_a_failed_receipt_keeps_the_schedule(client, pool, sender):
    sender.fail_with = SendFailed("500")
    res = await client.put("/v1/schedules", json=schedule(30))
    assert res.status_code == 200
    assert res.json()["receipt"] is False
    assert await count(pool, "reminders") == 1


async def test_the_subscription_cap_refuses_newcomers_but_not_returning_devices(
    client, monkeypatch
):
    monkeypatch.setattr(app_module, "MAX_SUBSCRIPTIONS", 1)
    assert (await client.put("/v1/schedules", json=schedule(30))).status_code == 200
    assert (await client.put("/v1/schedules", json=schedule(60))).status_code == 200
    other = schedule(30)
    other["subscription"]["endpoint"] = "https://fcm.googleapis.com/fcm/send/other"
    assert (await client.put("/v1/schedules", json=other)).status_code == 503


async def test_delete_removes_the_subscription_and_its_reminders(client, pool):
    await client.put("/v1/schedules", json=schedule(30, 60))
    res = await client.delete("/v1/schedules", params={"endpoint": ENDPOINT})
    assert res.status_code == 204
    assert await count(pool, "subscriptions") == 0
    assert await count(pool, "reminders") == 0
    again = await client.delete("/v1/schedules", params={"endpoint": ENDPOINT})
    assert again.status_code == 404


async def test_cors_admits_the_site_and_nobody_else(client):
    ok = await client.options(
        "/v1/schedules",
        headers={
            "Origin": "https://kneadtime.pizza",
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert ok.status_code == 200
    assert ok.headers["access-control-allow-origin"] == "https://kneadtime.pizza"
    assert "PUT" in ok.headers["access-control-allow-methods"]
    assert "DELETE" in ok.headers["access-control-allow-methods"]
    other = await client.options(
        "/v1/schedules",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "PUT"},
    )
    assert "access-control-allow-origin" not in other.headers


async def test_health_and_readiness(client):
    assert (await client.get("/healthz")).json() == {"ok": True}
    assert (await client.get("/readyz")).json() == {"ok": True}


async def test_readiness_fails_without_the_database(client, pool):
    await pool.close()
    assert (await client.get("/readyz")).status_code == 503
    assert (await client.get("/healthz")).status_code == 200


async def test_metrics_are_prometheus_text(client, sender):
    await client.put("/v1/schedules", json=schedule(30))
    res = await client.get("/metrics")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/plain")
    assert "# TYPE kneadtime_push_sent_total counter" in res.text
    assert "kneadtime_push_subscriptions " in res.text
