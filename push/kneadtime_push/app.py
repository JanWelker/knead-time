import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .config import Settings, load_settings
from .dispatcher import Clock, run_forever, run_once, utcnow
from .metrics import Metrics
from .models import SchedulePut
from .push import Gone, Sender, SendFailed, Target, make_sender
from .ratelimit import RateLimiter

log = logging.getLogger(__name__)

MAX_BODY_BYTES = 16 * 1024
MAX_SUBSCRIPTIONS = 10_000
HORIZON = timedelta(days=14)


def create_app(
    settings: Settings,
    sender: Sender | None = None,
    clock: Clock = utcnow,
    dispatch: bool = True,
) -> FastAPI:
    send = sender or make_sender(settings)
    metrics = Metrics()
    limiter = RateLimiter(lambda: clock().timestamp())
    pool = db.make_pool(settings.database_url)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        await pool.open()
        async with pool.connection() as conn:
            await db.ensure_schema(conn)
        task = asyncio.create_task(run_forever(pool, send, metrics, clock)) if dispatch else None
        try:
            yield
        finally:
            if task:
                task.cancel()
            await pool.close()

    app = FastAPI(title="kneadtime-push", docs_url=None, redoc_url=None, lifespan=lifespan)
    app.state.pool = pool
    app.state.metrics = metrics
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_methods=["GET", "PUT", "DELETE"],
        allow_headers=["Content-Type"],
        max_age=3600,
    )

    @app.middleware("http")
    async def cap_body(request: Request, call_next):
        length = request.headers.get("content-length")
        if length and length.isdigit() and int(length) > MAX_BODY_BYTES:
            return Response(status_code=413)
        return await call_next(request)

    # Per client, keyed on the address uvicorn reads out of X-Forwarded-For
    # from the trusted proxy (FORWARDED_ALLOW_IPS); the probes are exempt.
    @app.middleware("http")
    async def rate_limit(request: Request, call_next):
        if request.url.path.startswith("/v1/") and request.method != "OPTIONS":
            client = request.client.host if request.client else "unknown"
            ok, retry_after = limiter.allow(client)
            if not ok:
                metrics.limited += 1
                return Response(
                    '{"detail":"too many requests from this address"}',
                    status_code=429,
                    media_type="application/json",
                    headers={"Retry-After": str(retry_after)},
                )
        return await call_next(request)

    @app.get("/v1/vapid")
    async def vapid() -> dict:
        return {"publicKey": settings.vapid_public_key}

    @app.put("/v1/schedules")
    async def put_schedule(body: SchedulePut) -> dict:
        now = clock()
        if any(r.at > now + HORIZON for r in body.reminders):
            raise HTTPException(422, "a reminder lies more than 14 days ahead")
        future = [r for r in body.reminders if r.at >= now]
        async with pool.connection() as conn, conn.transaction():
            cur = await conn.execute(
                "SELECT 1 FROM subscriptions WHERE endpoint = %s", (body.subscription.endpoint,)
            )
            known = await cur.fetchone() is not None
            if not known and await db.count_subscriptions(conn) >= MAX_SUBSCRIPTIONS:
                raise HTTPException(503, "no room for another subscription")
            sub_id = await db.upsert_subscription(conn, body.subscription, now)
            await db.replace_reminders(conn, sub_id, future)
        receipt_sent = False
        if body.receipt:
            target = Target(
                body.subscription.endpoint,
                body.subscription.keys.p256dh,
                body.subscription.keys.auth,
            )
            payload = {"title": body.receipt.title, "body": body.receipt.body, "tag": "receipt"}
            try:
                await send(target, payload, "receipt")
                receipt_sent = True
            except Gone as exc:
                async with pool.connection() as conn:
                    await db.delete_subscription_by_id(conn, sub_id)
                raise HTTPException(410, "the push service refused this subscription") from exc
            except SendFailed as exc:
                log.warning("receipt failed: %s", exc)
        return {
            "scheduled": len(future),
            "dropped": len(body.reminders) - len(future),
            "receipt": receipt_sent,
        }

    @app.delete("/v1/schedules", status_code=204)
    async def delete_schedule(endpoint: str = Query(min_length=1, max_length=2000)) -> Response:
        async with pool.connection() as conn:
            if not await db.delete_subscription(conn, endpoint):
                raise HTTPException(404, "unknown subscription")
        return Response(status_code=204)

    @app.get("/healthz")
    async def healthz() -> dict:
        return {"ok": True}

    @app.get("/readyz")
    async def readyz() -> dict:
        try:
            async with pool.connection(timeout=2) as conn:
                await conn.execute("SELECT 1")
        except Exception as exc:
            raise HTTPException(503, "database unavailable") from exc
        return {"ok": True}

    @app.get("/metrics")
    async def prometheus() -> Response:
        return Response(metrics.render(), media_type="text/plain; version=0.0.4")

    async def dispatch_now() -> int:
        return await run_once(pool, send, metrics, clock())

    app.state.dispatch_now = dispatch_now
    return app


def main() -> FastAPI:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    return create_app(load_settings())
