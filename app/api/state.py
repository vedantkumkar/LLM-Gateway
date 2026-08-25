from functools import lru_cache

from app.config import get_settings
from app.services.gateway_service import GatewayService
from app.services.llm_service import get_llm_provider
from app.services.rate_limiter import RateLimiter, build_rate_limiter


@lru_cache
def get_rate_limiter() -> RateLimiter:
    settings = get_settings()
    return build_rate_limiter(settings.rate_limit_backend, settings.redis_url, settings.rate_limit_per_minute)


@lru_cache
def get_gateway_service() -> GatewayService:
    settings = get_settings()
    return GatewayService(settings, get_llm_provider(settings.llm_provider))
