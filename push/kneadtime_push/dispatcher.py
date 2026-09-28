import asyncio
import logging
from collections.abc import Callable
from datetime import UTC, datetime

from psycopg_pool import AsyncConnectionPool

from . import db
from .metrics import Metrics
from .push import Gone, Sender, SendFailed, Target

log = logging.getLogger(__name__)

INTERVAL_SECONDS = 30
Clock = Callable[[], datetime]


def utcnow() -> datetime:
    return datetime.now(UTC)


async def run_once(
    pool: AsyncConnectionPool, sender: Sender, metrics: Metrics, now: datetime
) -> int:
    """Send every due reminder once; returns how many were delivered."""
    async with pool.connection() as conn:
        due = await db.claim_due(conn, now)
    delivered = 0
    for reminder in due:
        target = Target(reminder.endpoint, reminder.p256dh, reminder.auth)
        payload = {"title": reminder.title, "body": reminder.body, "tag": reminder.uid}
        try:
            await sender(target, payload, reminder.uid)
        except Gone:
            metrics.gone += 1
            async with pool.connection() as conn:
                await db.delete_subscription_by_id(conn, reminder.subscription_id)
            continue
        except SendFailed as exc:
            metrics.failed += 1
            log.warning("send failed (attempt %d): %s", reminder.attempts, exc)
            continue
        metrics.sent += 1
        delivered += 1
        async with pool.connection() as conn:
            await db.mark_sent(conn, reminder.id, now)
    async with pool.connection() as conn:
        await db.sweep(conn, now)
        metrics.subscriptions = await db.count_subscriptions(conn)
    if delivered:
        log.info("delivered %d reminder(s)", delivered)
    return delivered


async def run_forever(
    pool: AsyncConnectionPool,
    sender: Sender,
    metrics: Metrics,
    clock: Clock = utcnow,
    interval: float = INTERVAL_SECONDS,
) -> None:
    while True:
        try:
            await run_once(pool, sender, metrics, clock())
        except Exception:
            log.exception("dispatcher pass failed")
        await asyncio.sleep(interval)
