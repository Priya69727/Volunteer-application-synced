from pathlib import Path
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_env_file = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    environment: str = "development"
    database_url: str
    jwt_secret: str
    jwt_expire_minutes: int = 10080
    session_cookie_secure: bool = False
    app_origin: str = "http://localhost:5174"
    # Comma-separated extra browser origins allowed to call the API (the Volunteer Portal).
    portal_origins: str = (
        "http://localhost:5175,http://127.0.0.1:5175,"
        "http://localhost:8443,http://127.0.0.1:8443"
    )
    host: str = "127.0.0.1"
    port: int = 8000

    model_config = SettingsConfigDict(env_file=(_env_file, ".env"), env_file_encoding="utf-8", case_sensitive=False)

    @model_validator(mode="after")
    def validate_production_settings(self):
        if self.environment not in {"development", "test", "production"}:
            raise ValueError("ENVIRONMENT must be development, test, or production")
        if self.environment == "production" and not self.session_cookie_secure:
            raise ValueError("SESSION_COOKIE_SECURE must be true in production")
        return self

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 characters")
        return value

    @field_validator("jwt_expire_minutes")
    @classmethod
    def validate_jwt_expiry(cls, value: int) -> int:
        if not 5 <= value <= 43200:
            raise ValueError("JWT_EXPIRE_MINUTES must be between 5 and 43200")
        return value


settings = Settings()
