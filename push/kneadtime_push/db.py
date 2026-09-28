from dataclasses import dataclass
from datetime import datetime, timedelta
from importlib.resources import files

from psycopg import AsyncConnection
from psycopg.rows import class_row
from psycopg_pool import AsyncConnectionPool

from .models import Reminder, Subscription

SENT_RETENTION = timedelta(hours=24)
IDLE_RETENTION = timedelta(days=30)
MAX_ATTEMPTS = 3


@dataclass
class DueReminder:
    id: int
    uid: str
    title: str
    body: str
    endpoint: str
    p256dh: str
    auth: str
    subscription_id: int
    attempts: int


def make_pool(database_url: str) -> AsyncConnectionPool:
    return AsyncConnectionPool(database_url, open=False, min_size=1, max_size=4)


async def ensure_schema(conn: AsyncConnection) -> None:
    schema = files("kneadtime_push").joinpath("schema.sql").read_text()
    await conn.execute(schema)


async def count_subscriptions(conn: AsyncConnection) -> int:
    cur = await conn.execute("SELECT count(*) FROM subscriptions")
    row = await cur.fetchone()
    return int(row[0]) if row else 0


async def upsert_subscription(conn: AsyncConnection, sub: Subscription, now: datetime) -> int:
    cur = await conn.execute(
        """
        INSERT INTO subscriptions (endpoint, p256dh, auth, created_at, last_seen_at)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (endpoint) DO UPDATE
          SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, last_seen_at = EXCLUDED.last_seen_at
        RETURNING id
        """,
        (sub.endpoint, sub.keys.p256dh, sub.keys.auth, now, now),
    )
    row = await cur.fetchone()
    assert row is not None
    return int(row[0])


async def replace_reminders(
    conn: AsyncConnection, subscription_id: int, reminders: list[Reminder]
) -> None:
    await conn.execute("DELETE FROM reminders WHERE subscription_id = %s", (subscription_id,))
    async with conn.cursor() as cur:
        await cur.executemany(
            """
            INSERT INTO reminders (subscription_id, uid, send_at, title, body)
            VALUES (%s, %s, %s, %s, %s)
            """,
            [(subscription_id, r.uid, r.at, r.title, r.body) for r in reminders],
        )


async def claim_due(conn: AsyncConnection, now: datetime, limit: int = 50) -> list[DueReminder]:
    """Bump `attempts` on every due row and hand them back; a failed send retries next pass."""
    async with conn.cursor(row_factory=class_row(DueReminder)) as cur:
        await cur.execute(
            """
            WITH due AS (
              SELECT id FROM reminders
              WHERE sent_at IS NULL AND attempts < %s AND send_at <= %s
              ORDER BY send_at
              LIMIT %s
              FOR UPDATE SKIP LOCKED
            ), claimed AS (
              UPDATE reminders r SET attempts = r.attempts + 1
              FROM due WHERE r.id = due.id
              RETURNING r.id, r.uid, r.title, r.body, r.subscription_id, r.attempts
            )
            SELECT c.id, c.uid, c.title, c.body, s.endpoint, s.p256dh, s.auth,
                   c.subscription_id, c.attempts
            FROM claimed c JOIN subscriptions s ON s.id = c.subscription_id
            """,
            (MAX_ATTEMPTS, now, limit),
        )
        return await cur.fetchall()


async def mark_sent(conn: AsyncConnection, reminder_id: int, now: datetime) -> None:
    await conn.execute("UPDATE reminders SET sent_at = %s WHERE id = %s", (now, reminder_id))


async def delete_subscription_by_id(conn: AsyncConnection, subscription_id: int) -> None:
    await conn.execute("DELETE FROM subscriptions WHERE id = %s", (subscription_id,))


async def delete_subscription(conn: AsyncConnection, endpoint: str) -> bool:
    cur = await conn.execute("DELETE FROM subscriptions WHERE endpoint = %s", (endpoint,))
    return cur.rowcount > 0


async def sweep(conn: AsyncConnection, now: datetime) -> None:
    await conn.execute("DELETE FROM reminders WHERE sent_at < %s", (now - SENT_RETENTION,))
    await conn.execute(
        "DELETE FROM reminders WHERE sent_at IS NULL AND attempts >= %s AND send_at < %s",
        (MAX_ATTEMPTS, now - SENT_RETENTION),
    )
    await conn.execute(
        """
        DELETE FROM subscriptions s
        WHERE s.last_seen_at < %s
          AND NOT EXISTS (SELECT 1 FROM reminders r WHERE r.subscription_id = s.id)
        """,
        (now - IDLE_RETENTION,),
    )
