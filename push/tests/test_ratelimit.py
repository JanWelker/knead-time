from kneadtime_push.ratelimit import BURST, IDLE_SECONDS, RATE_PER_MINUTE, RateLimiter


class Ticking:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_the_limits_are_the_documented_ones():
    assert RATE_PER_MINUTE == 30
    assert BURST == 30
    assert IDLE_SECONDS == 600


def test_a_client_gets_its_burst_then_waits():
    clock = Ticking()
    limiter = RateLimiter(clock)
    for _ in range(BURST):
        assert limiter.allow("1.2.3.4") == (True, 0)
    ok, retry = limiter.allow("1.2.3.4")
    assert not ok
    assert retry == 2  # one token every two seconds at thirty a minute


def test_tokens_refill_with_time():
    clock = Ticking()
    limiter = RateLimiter(clock)
    for _ in range(BURST):
        limiter.allow("1.2.3.4")
    clock.now += 2
    assert limiter.allow("1.2.3.4") == (True, 0)
    assert limiter.allow("1.2.3.4")[0] is False
    clock.now += 600
    for _ in range(BURST):
        assert limiter.allow("1.2.3.4")[0]


def test_clients_do_not_share_a_bucket():
    limiter = RateLimiter(Ticking())
    for _ in range(BURST):
        limiter.allow("1.2.3.4")
    assert limiter.allow("1.2.3.4")[0] is False
    assert limiter.allow("5.6.7.8") == (True, 0)


def test_idle_clients_are_forgotten_once_the_table_grows():
    clock = Ticking()
    limiter = RateLimiter(clock)
    for i in range(1001):
        limiter.allow(f"10.0.{i // 256}.{i % 256}")
    assert len(limiter) == 1001
    clock.now += IDLE_SECONDS + 1
    limiter.allow("fresh")
    assert len(limiter) == 1
