from collections.abc import Callable
from dataclasses import dataclass, field

# One tap is two or three requests; thirty a minute is a phone being retried
# by hand, not a script. Applies to /v1/ only, never to the probes.
RATE_PER_MINUTE = 30
BURST = 30
IDLE_SECONDS = 600

Clock = Callable[[], float]


@dataclass
class _Bucket:
    tokens: float
    seen: float


@dataclass
class RateLimiter:
    """A token bucket per client, in memory: the service runs as one replica."""

    clock: Clock
    rate_per_minute: float = RATE_PER_MINUTE
    burst: int = BURST
    _buckets: dict[str, _Bucket] = field(default_factory=dict)

    def allow(self, client: str) -> tuple[bool, int]:
        """Whether this request may proceed, and if not, seconds until one may."""
        now = self.clock()
        per_second = self.rate_per_minute / 60
        bucket = self._buckets.get(client)
        if bucket is None:
            bucket = _Bucket(tokens=float(self.burst), seen=now)
            self._buckets[client] = bucket
        else:
            bucket.tokens = min(float(self.burst), bucket.tokens + (now - bucket.seen) * per_second)
            bucket.seen = now
        if len(self._buckets) > 1000:
            self._prune(now)
        if bucket.tokens >= 1:
            bucket.tokens -= 1
            return True, 0
        return False, max(1, int((1 - bucket.tokens) / per_second + 0.999))

    def _prune(self, now: float) -> None:
        for client in [c for c, b in self._buckets.items() if now - b.seen > IDLE_SECONDS]:
            del self._buckets[client]

    def __len__(self) -> int:
        return len(self._buckets)
