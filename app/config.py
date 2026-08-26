from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite:///./gateway.db"
    llm_provider: str = "mock"
    pii_engine: str = "auto"
    rate_limit_backend: str = "memory"
    rate_limit_per_minute: int = 60
    redis_url: str = ""
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080"
    prompt_injection_block_threshold: int = 70
    pii_action: str = "REDACT_AND_ALLOW"
    secret_action: str = "BLOCK"
    response_scanning_enabled: bool = True
    app_title: str = Field(default="Enterprise LLM & GenAI Security Gateway")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
