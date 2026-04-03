
from pydantic_settings import BaseSettings
from loguru import logger
import sys

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://slackline:slackline@db/slackline"
    SECRET_KEY: str = "devsecretkey-change-in-production"
    IMPORT_SECRET: str = "importme"
    OAUTH_GOOGLE_CLIENT_ID: str = ""
    OAUTH_GOOGLE_CLIENT_SECRET: str = ""
    # Public URLs - MUST match what's registered in Google Cloud Console
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    UPLOAD_DIR: str = "/app/uploads"
    DATA_DIR: str = "/app/data"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24 * 7  # 1 week
    class Config:
        env_file = ".env"
        extra = "allow"
settings = Settings()
# Configure loguru
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO",
)
