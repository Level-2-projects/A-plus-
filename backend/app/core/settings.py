"""Environment-only backend configuration."""
from dataclasses import dataclass
import os

@dataclass(frozen=True)
class Settings:
    """Holds environment-driven runtime settings."""
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./aplus.db")
    jwt_secret: str = os.getenv("JWT_SECRET", "development-only-secret")
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
    app_env: str = os.getenv("APP_ENV", "dev")
    cors_origins: tuple[str, ...] = tuple(os.getenv("CORS_ORIGINS", "http://127.0.0.1:5500,http://localhost:5500").split(","))

settings = Settings()
