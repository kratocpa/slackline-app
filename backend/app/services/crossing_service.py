from typing import Optional

import math
from datetime import datetime
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.models.crossing import Crossing
from app.models.user import User
from app.schemas.crossing import (
    CrossingCreate,
    CrossingItem,
    CrossingListResponse,
    CrossingUpdate,
    StatisticsResponse,
)
from app.schemas.user import UserBrief
async def get_crossings(
    db: AsyncSession,
    slackline_id: int,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "date",
    sort_dir: str = "desc",
) -> CrossingListResponse:
    base_query = select(Crossing).where(Crossing.slackline_id == slackline_id)
    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar() or 0
    sort_column = getattr(Crossing, sort_by, Crossing.date)
    if sort_dir.lower() == "desc":
        base_query = base_query.order_by(sort_column.desc().nullslast())
    else:
        base_query = base_query.order_by(sort_column.asc().nullslast())
    base_query = base_query.options(joinedload(Crossing.user))
    base_query = base_query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(base_query)
    crossings = result.scalars().unique().all()
    items = []
    for c in crossings:
        user_brief = None
        if c.user:
            user_brief = UserBrief(
                id=c.user.id,
                username=c.user.username,
                avatar_url=c.user.avatar_url,
            )
        items.append(
            CrossingItem(
                id=c.id,
                slackline_id=c.slackline_id,
                date=c.date,
                style=c.style,
                accent_description=c.accent_description,
                rating=c.rating,
                image_url=c.image_url,
                project=c.project,
                user=user_brief,
                created_at=c.created_at,
            )
        )
    return CrossingListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 0,
    )
async def create_crossing(
    db: AsyncSession,
    slackline_id: int,
    data: CrossingCreate,
    user: User,
    image_url: Optional[str] = None,
) -> Crossing:
    crossing = Crossing(
        slackline_id=slackline_id,
        user_id=user.id,
        date=data.date,
        style=data.style,
        accent_description=data.accent_description,
        rating=data.rating,
        project=data.project,
        image_url=image_url,
    )
    db.add(crossing)
    await db.flush()
    return crossing
async def update_crossing(
    db: AsyncSession,
    crossing_id: int,
    data: CrossingUpdate,
) -> Optional[Crossing]:
    result = await db.execute(select(Crossing).where(Crossing.id == crossing_id))
    crossing = result.scalar_one_or_none()
    if not crossing:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(crossing, key, value)
    crossing.updated_at = datetime.utcnow()
    await db.flush()
    return crossing
async def delete_crossing(db: AsyncSession, crossing_id: int) -> bool:
    result = await db.execute(select(Crossing).where(Crossing.id == crossing_id))
    crossing = result.scalar_one_or_none()
    if not crossing:
        return False
    await db.delete(crossing)
    await db.flush()
    return True
async def get_statistics(db: AsyncSession, slackline_id: int) -> StatisticsResponse:
    # Total crossings
    total_result = await db.execute(
        select(func.count()).where(Crossing.slackline_id == slackline_id)
    )
    total = total_result.scalar() or 0
    # Average rating
    avg_result = await db.execute(
        select(func.avg(Crossing.rating)).where(
            Crossing.slackline_id == slackline_id,
            Crossing.rating.isnot(None),
        )
    )
    avg_rating = avg_result.scalar()
    # Style distribution
    style_result = await db.execute(
        select(Crossing.style, func.count().label("count"))
        .where(Crossing.slackline_id == slackline_id, Crossing.style.isnot(None), Crossing.style != "")
        .group_by(Crossing.style)
        .order_by(func.count().desc())
    )
    style_distribution = [{"style": row[0], "count": row[1]} for row in style_result.all()]
    # Top users
    top_users_result = await db.execute(
        select(User.username, func.count().label("count"))
        .join(Crossing, Crossing.user_id == User.id)
        .where(Crossing.slackline_id == slackline_id)
        .group_by(User.username)
        .order_by(func.count().desc())
        .limit(10)
    )
    top_users = [{"username": row[0], "count": row[1]} for row in top_users_result.all()]
    return StatisticsResponse(
        total_crossings=total,
        style_distribution=style_distribution,
        top_users=top_users,
        average_rating=float(avg_rating) if avg_rating else None,
    )
