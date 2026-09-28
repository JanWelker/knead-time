import os
import shutil
import subprocess
import tempfile
from collections.abc import AsyncIterator, Iterator
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pytest
from py_vapid import Vapid

from kneadtime_push import db
from kneadtime_push.app import create_app
from kneadtime_push.config import Settings, public_key_of
from kneadtime_push.push import Target

PG_BIN_CANDIDATES = (
    Path("/opt/homebrew/opt/postgresql@18/bin"),
    Path("/usr/lib/postgresql/18/bin"),
)


def _pg_bin(tool: str) -> str:
    found = shutil.which(tool)
    if found:
        return found
    for candidate in PG_BIN_CANDIDATES:
        if (candidate / tool).exists():
            return str(candidate / tool)
    raise RuntimeError(f"{tool} not found; set DATABASE_URL or install PostgreSQL")


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    """A throwaway cluster on a unix socket, unless CI hands one over in DATABASE_URL."""
    given = os.environ.get("DATABASE_URL")
    if given:
        yield given
        return
    data = Path(tempfile.mkdtemp(prefix="kneadtime-pg-"))
    subprocess.run(
        [_pg_bin("initdb"), "-D", str(data), "-U", "postgres", "--auth=trust", "-A", "trust"],
        check=True,
        capture_output=True,
    )
    subprocess.run(
        [
            _pg_bin("pg_ctl"),
            "-D",
            str(data),
            "-o",
            f"-k {data} -c listen_addresses='' -c fsync=off",
            "-l",
            str(data / "log"),
            "-w",
            "start",
        ],
        check=True,
        capture_output=True,
    )
    try:
        yield f"postgresql://postgres@/postgres?host={data}"
    finally:
        subprocess.run([_pg_bin("pg_ctl"), "-D", str(data), "-m", "immediate", "stop"], check=False)
        shutil.rmtree(data, ignore_errors=True)


@pytest.fixture
def settings(database_url: str) -> Settings:
    vapid = Vapid()
    vapid.generate_keys()
    return Settings(
        database_url=database_url,
        vapid=vapid,
        vapid_public_key=public_key_of(vapid),
        vapid_subject="https://kneadtime.pizza",
        allowed_origins=("https://kneadtime.pizza",),
    )


class FakeSender:
    def __init__(self) -> None:
        self.calls: list[tuple[Target, dict, str]] = []
        self.fail_with: Exception | None = None

    async def __call__(self, target: Target, payload: dict, topic: str) -> None:
        self.calls.append((target, payload, topic))
        if self.fail_with is not None:
            raise self.fail_with


class FakeClock:
    def __init__(self, at: datetime) -> None:
        self.at = at

    def __call__(self) -> datetime:
        return self.at


NOW = datetime(2026, 9, 28, 12, 0, tzinfo=UTC)


@pytest.fixture
def sender() -> FakeSender:
    return FakeSender()


@pytest.fixture
def clock() -> FakeClock:
    return FakeClock(NOW)


@pytest.fixture
async def app(settings: Settings, sender: FakeSender, clock: FakeClock):
    application = create_app(settings, sender=sender, clock=clock, dispatch=False)
    async with application.router.lifespan_context(application):
        async with application.state.pool.connection() as conn:
            await conn.execute("TRUNCATE subscriptions, reminders RESTART IDENTITY CASCADE")
        yield application


@pytest.fixture
async def client(app) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="https://push.test") as c:
        yield c


@pytest.fixture
def pool(app):
    return app.state.pool


async def count(pool, table: str) -> int:
    async with pool.connection() as conn:
        cur = await conn.execute(f"SELECT count(*) FROM {table}")
        row = await cur.fetchone()
        return int(row[0])


__all__ = ["NOW", "FakeClock", "FakeSender", "count", "db"]
