
import os
import uuid
from fastapi import UploadFile
from loguru import logger
from app.config import settings
async def save_upload(file: UploadFile, subdir: str = "crossings") -> str:
    upload_dir = os.path.join(settings.UPLOAD_DIR, subdir)
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    logger.info(f"Saved upload: {filepath}")
    return f"/uploads/{subdir}/{filename}"
