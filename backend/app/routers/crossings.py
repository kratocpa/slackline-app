from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.models.crossing import Crossing
from app.models.user import User
from app.schemas.crossing import (
    CrossingCreate,
    CrossingItem,
    CrossingListResponse,
    CrossingUpdate,
)
from app.services import crossing_service
from app.utils.image_upload import save_upload
router = APIRouter(prefix="/slacklines/{slackline_id}/crossings", tags=["crossings"])
@router.get("", response_model=CrossingListResponse)
async def list_crossings(
    slackline_id: int,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "date",
    sort_dir: str = "desc",
    db: AsyncSession = Depends(get_db),
):
    return await crossing_service.get_crossings(
        db=db,
        slackline_id=slackline_id,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
@router.post("", response_model=CrossingItem, status_code=status.HTTP_201_CREATED)
async def create_crossing(
    slackline_id: int,
    date: Optional[str] = Form(None),
    style: Optional[str] = Form(None),
    accent_description: Optional[str] = Form(None),
    rating: Optional[int] = Form(None),
    project: Optional[bool] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from datetime import date as date_type
    image_url = None
    if image and image.filename:
        image_url = await save_upload(image)
    parsed_date = None
    if date:
        try:
            parsed_date = date_type.fromisoformat(date)
        except ValueError:
            pass
    data = CrossingCreate(
        date=parsed_date,
        style=style,
        accent_description=accent_description,
        rating=rating,
        project=project,
    )
    crossing = await crossing_service.create_crossing(db, slackline_id, data, user, image_url)
    from app.schemas.user import UserBrief
    user_brief = UserBrief(id=user.id, username=user.username, avatar_url=user.avatar_url)
    return CrossingItem(
        id=crossing.id,
        slackline_id=crossing.slackline_id,
        date=crossing.date,
        style=crossing.style,
        accent_description=crossing.accent_description,
        rating=crossing.rating,
        image_url=crossing.image_url,
        project=crossing.project,
        user=user_brief,
        created_at=crossing.created_at,
    )
@router.patch("/{crossing_id}", response_model=CrossingItem)
async def update_crossing(
    slackline_id: int,
    crossing_id: int,
    data: CrossingUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Crossing).where(Crossing.id == crossing_id))
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Crossing not found")
    if existing.user_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    crossing = await crossing_service.update_crossing(db, crossing_id, data)
    return crossing
@router.delete("/{crossing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_crossing(
    slackline_id: int,
    crossing_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Crossing).where(Crossing.id == crossing_id))
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Crossing not found")
    if existing.user_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    await crossing_service.delete_crossing(db, crossing_id)
