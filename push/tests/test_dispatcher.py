import asyncio
from datetime import timedelta

from kneadtime_push import db, dispatcher
from kneadtime_push.dispatcher import run_forever, run_once
from kneadtime_push.metrics import Metrics
from kneadtime_push.models import Reminder, Subscription
from kneadtime_push.push import Gone, SendFailed

from .conftest import NOW, FakeSender, count

SUB = Subscription(
    endpoint="https://web.push.apple.com/one", keys={"p256dh": "BPub", "auth": "sec"}
)


async def seed(pool, *offsets_minutes: int, sub: Subscription = SUB, seen=NOW) -> int:
    async with pool.connection() as conn:
        sub_id = await db.upsert_subscription(conn, sub, seen)
        await db.replace_reminders(
            conn,
            sub_id,
            [
                Reminder(
                    uid=f"step-{i}",
                    at=NOW + timedelta(minutes=m),
                    title=f"Step {i}",
                    body=f"Do {i}",
                )
                for i, m in enumerate(offsets_minutes)
            ],
        )
    return sub_id


async def unsent(pool) -> int:
    async with pool.connection() as conn:
        cur = await conn.execute("SELECT count(*) FROM reminders WHERE sent_at IS NULL")
        return int((await cur.fetchone())[0])


async def test_due_reminders_go_out_with_their_uid_as_the_topic(pool, sender):
    await seed(pool, -10, 0, 30)
    metrics = Metrics()
    delivered = await run_once(pool, sender, metrics, NOW)
    assert delivered == 2
    assert [(p, t) for _, p, t in sender.calls] == [
        ({"title": "Step 0", "body": "Do 0", "tag": "step-0"}, "step-0"),
        ({"title": "Step 1", "body": "Do 1", "tag": "step-1"}, "step-1"),
    ]
    assert sender.calls[0][0].endpoint == SUB.endpoint
    assert await unsent(pool) == 1
    assert metrics.sent == 2 and metrics.subscriptions == 1


async def test_a_sent_reminder_is_not_sent_twice(pool, sender):
    await seed(pool, 0)
    await run_once(pool, sender, Metrics(), NOW)
    await run_once(pool, sender, Metrics(), NOW + timedelta(minutes=5))
    assert len(sender.calls) == 1


async def test_a_failed_send_is_retried_three_times_then_given_up(pool, sender):
    await seed(pool, 0)
    sender.fail_with = SendFailed("500")
    metrics = Metrics()
    for _ in range(5):
        await run_once(pool, sender, metrics, NOW)
    assert len(sender.calls) == db.MAX_ATTEMPTS == 3
    assert metrics.failed == 3
    assert await unsent(pool) == 1
    # A day later the abandoned row is swept so the table cannot fill with corpses.
    await run_once(pool, sender, metrics, NOW + timedelta(hours=25))
    assert await count(pool, "reminders") == 0


async def test_a_refused_subscription_is_deleted_with_its_reminders(pool, sender):
    await seed(pool, 0, 60)
    sender.fail_with = Gone("410")
    metrics = Metrics()
    await run_once(pool, sender, metrics, NOW)
    assert await count(pool, "subscriptions") == 0
    assert await count(pool, "reminders") == 0
    assert metrics.gone == 1 and metrics.subscriptions == 0


async def test_sent_reminders_are_swept_after_a_day(pool, sender):
    await seed(pool, 0, 60 * 48)
    await run_once(pool, sender, Metrics(), NOW)
    assert await count(pool, "reminders") == 2
    await run_once(pool, sender, Metrics(), NOW + timedelta(hours=23))
    assert await count(pool, "reminders") == 2
    await run_once(pool, sender, Metrics(), NOW + timedelta(hours=25))
    assert await count(pool, "reminders") == 1


async def test_idle_subscriptions_are_swept_after_thirty_days_unless_something_is_pending(
    pool, sender
):
    idle = Subscription(
        endpoint="https://fcm.googleapis.com/fcm/send/idle", keys={"p256dh": "a", "auth": "b"}
    )
    await seed(pool, sub=idle, seen=NOW - timedelta(days=31))
    await seed(pool, 60 * 24 * 40, seen=NOW - timedelta(days=31))
    await run_once(pool, sender, Metrics(), NOW)
    assert await count(pool, "subscriptions") == 1


async def test_the_loop_survives_a_failing_pass(pool, monkeypatch):
    calls = 0

    async def flaky(*_):
        nonlocal calls
        calls += 1
        if calls == 1:
            raise RuntimeError("boom")

    monkeypatch.setattr(dispatcher, "run_once", flaky)
    task = asyncio.create_task(run_forever(pool, FakeSender(), Metrics(), interval=0.01))
    await asyncio.sleep(0.1)
    task.cancel()
    assert calls >= 2


def test_the_cadence_and_retention_are_the_documented_ones():
    assert dispatcher.INTERVAL_SECONDS == 30
    assert timedelta(hours=24) == db.SENT_RETENTION
    assert timedelta(days=30) == db.IDLE_RETENTION
