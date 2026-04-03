
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger
from sqlalchemy import text
from app.config import settings
from app.database import Base, engine
from app.routers import auth, crossings, diary, history, import_data, slacklines, slackliners, statistics
app = FastAPI(title="Slackline API", version="1.0.0")
# CORS
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(slacklines.router, prefix="/api/v1")
app.include_router(crossings.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(statistics.router, prefix="/api/v1")
app.include_router(import_data.router, prefix="/api/v1")
app.include_router(diary.router, prefix="/api/v1")
app.include_router(slackliners.router, prefix="/api/v1")
# Serve uploads
upload_dir = settings.UPLOAD_DIR
try:
    os.makedirs(upload_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")
except (PermissionError, OSError):
    logger.warning(f"Cannot create/mount upload directory: {upload_dir}")
@app.on_event("startup")
async def startup():
    logger.info("Starting Slackline API...")
    if not settings.OAUTH_GOOGLE_CLIENT_ID or settings.OAUTH_GOOGLE_CLIENT_ID == "your-google-client-id.apps.googleusercontent.com":
        logger.warning(
            "⚠️  OAUTH_GOOGLE_CLIENT_ID is not set! "
            "Google login will fail. Copy backend/.env.example to backend/.env and fill in your credentials."
        )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Idempotent column additions for existing databases
        for alter_sql in [
            "ALTER TABLE slacklines ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(512)",
            "ALTER TABLE slacklines ADD COLUMN IF NOT EXISTS restriction TEXT",
            "ALTER TABLE slacklines ADD COLUMN IF NOT EXISTS type VARCHAR(50)",
        ]:
            try:
                await conn.execute(text(alter_sql))
            except Exception:
                pass
        # Populate type from height for existing rows that have no type set
        try:
            await conn.execute(text(
                "UPDATE slacklines SET type = 'highline' WHERE height IS NOT NULL AND height > 10 AND type IS NULL"
            ))
            await conn.execute(text(
                "UPDATE slacklines SET type = 'midline' WHERE height IS NOT NULL AND height <= 10 AND type IS NULL"
            ))
        except Exception:
            pass
    logger.info("Database tables created/verified")
@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}
