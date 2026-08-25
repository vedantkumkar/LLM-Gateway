from collections import defaultdict, deque
from typing import Protocol
from datetime import datetime, timedelta, timezone


class RateLimiter(Protocol):
    def allow(self, user_id: str) -> bool:
        ...

    def status(self) -> str:
        ...


class InMemoryRateLimiter:
    def __init__(self, requests_per_minute: int) -> None:
        self.requests_per_minute = requests_per_minute
        self._requests: dict[str, deque[datetime]] = defaultdict(deque)

    def allow(self, user_id: str) -> bool:
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=1)
        bucket = self._requests[user_id]
        while bucket and bucket[0] < window_start:
            bucket.popleft()
        if len(bucket) >= self.requests_per_minute:
            return False
        bucket.append(now)
        return True

    def status(self) -> str:
        return "operational"


class RedisRateLimiter:
    def __init__(self, redis_url: str, requests_per_minute: int) -> None:
        import redis

        self.requests_per_minute = requests_per_minute
        self.client = redis.Redis.from_url(redis_url, decode_responses=True)
        self.client.ping()

    def allow(self, user_id: str) -> bool:
        now = datetime.now(timezone.utc)
        key = f"rate-limit:{user_id}:{now.strftime('%Y%m%d%H%M')}"
        current = self.client.incr(key)
        if current == 1:
            self.client.expire(key, 60)
        return int(current) <= self.requests_per_minute

    def status(self) -> str:
        try:
            self.client.ping()
        except Exception:
            return "unavailable"
        return "operational"


def build_rate_limiter(backend: str, redis_url: str, requests_per_minute: int) -> RateLimiter:
    normalized_backend = backend.lower()
    if normalized_backend == "memory":
        return InMemoryRateLimiter(requests_per_minute)
    if normalized_backend in {"redis", "auto"} and redis_url:
        try:
            return RedisRateLimiter(redis_url, requests_per_minute)
        except Exception:
            if normalized_backend == "redis":
                raise
    return InMemoryRateLimiter(requests_per_minute)
