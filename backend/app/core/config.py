from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration from environment variables."""

    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "factorypulse"
    JWT_SECRET_KEY: str = "change_this_to_a_long_random_secret_key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    UPLOAD_MAX_MB: int = 10
    APP_TIMEZONE_DEFAULT: str = "UTC"
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
