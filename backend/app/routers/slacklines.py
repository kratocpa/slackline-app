from typing import Optional
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.slackline import (
    SlacklineCreate,
    SlacklineDetail,
    SlacklineListResponse,
    SlacklineUpdate,
)
from app.services import slackline_service
from app.services.history_service import record_change
from app.utils.image_upload import save_upload

router = APIRouter(prefix="/slacklines", tags=["slacklines"])


@router.get("/filter-options")
async def get_filter_options(
    state: Optional[str] = None,
    region: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Return distinct states; if state given also regions; if state+region given also sectors."""
    from sqlalchemy import select, distinct
    from app.models.slackline import Slackline

    states_q = select(distinct(Slackline.state)).where(Slackline.state.isnot(None)).order_by(Slackline.state)
    states = [r[0] for r in (await db.execute(states_q)).all()]

    regions = []
    if state:
        regions_q = (
            select(distinct(Slackline.region))
            .where(Slackline.state == state, Slackline.region.isnot(None))
            .order_by(Slackline.region)
        )
        regions = [r[0] for r in (await db.execute(regions_q)).all()]

    sectors = []
    if state and region:
        sectors_q = (
            select(distinct(Slackline.sector))
            .where(Slackline.state == state, Slackline.region == region, Slackline.sector.isnot(None))
            .order_by(Slackline.sector)
        )
        sectors = [r[0] for r in (await db.execute(sectors_q)).all()]

    return {"states": states, "regions": regions, "sectors": sectors}


@router.get("", response_model=SlacklineListResponse)
async def list_slacklines(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    sort_by: str = "name",
    sort_dir: str = "asc",
    state: Optional[str] = None,
    region: Optional[str] = None,
    sector: Optional[str] = None,
    min_length: Optional[float] = None,
    max_length: Optional[float] = None,
    min_height: Optional[float] = None,
    max_height: Optional[float] = None,
    min_rating: Optional[int] = None,
    bounds: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    return await slackline_service.get_slacklines(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
        state=state,
        region=region,
        sector=sector,
        min_length=min_length,
        max_length=max_length,
        min_height=min_height,
        max_height=max_height,
        min_rating=min_rating,
        bounds=bounds,
    )


@router.get("/{slackline_id}", response_model=SlacklineDetail)
async def get_slackline(slackline_id: int, db: AsyncSession = Depends(get_db)):
    detail = await slackline_service.get_slackline_detail(db, slackline_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Slackline not found")
    return detail


@router.post("", response_model=SlacklineDetail, status_code=status.HTTP_201_CREATED)
async def create_slackline(
    data: str = Form(..., description="JSON-encoded SlacklineCreate"),
    cover_image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        parsed = SlacklineCreate.model_validate(json.loads(data))
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    cover_image_url = None
    if cover_image and cover_image.filename:
        cover_image_url = await save_upload(cover_image, subdir="slacklines")
    sl = await slackline_service.create_slackline(db, parsed, user, cover_image_url=cover_image_url)
    return await slackline_service.get_slackline_detail(db, sl.id)


@router.patch("/{slackline_id}", response_model=SlacklineDetail)
async def update_slackline(
    slackline_id: int,
    data: str = Form(..., description="JSON-encoded SlacklineUpdate"),
    cover_image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        parsed = SlacklineUpdate.model_validate(json.loads(data))
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    existing = await slackline_service.get_slackline_detail(db, slackline_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Slackline not found")
    if existing.created_by_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to edit this slackline")
    cover_image_url = None
    if cover_image and cover_image.filename:
        cover_image_url = await save_upload(cover_image, subdir="slacklines")
    sl, changes = await slackline_service.update_slackline(
        db, slackline_id, parsed, user, cover_image_url=cover_image_url
    )
    if changes:
        await record_change(db, "slackline", slackline_id, user, changes)
    return await slackline_service.get_slackline_detail(db, slackline_id)


@router.delete("/{slackline_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_slackline(
    slackline_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from sqlalchemy import select
    from app.models.slackline import Slackline
    result = await db.execute(select(Slackline).where(Slackline.id == slackline_id))
    sl = result.scalar_one_or_none()
    if not sl:
        raise HTTPException(status_code=404, detail="Slackline not found")
    if sl.created_by_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this slackline")
    await db.delete(sl)
    await db.flush()

