"""
Slackliners – public user statistics endpoint.
GET /slackliners                    → list of all users with crossing stats
GET /slackliners/{user_id}/stats    → detailed stats for one user
GET /slackliners/{user_id}/lines    → lines crossed by user (diary-style paginated list)
"""
from typing import Optional
import math
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.crossing import Crossing
from app.models.slackline import Component, Point, Slackline
from app.models.user import User
from app.schemas.slackline import PointResponse

router = APIRouter(prefix="/slackliners", tags=["slackliners"])


# ── Response models ────────────────────────────────────────────────────────────

class SlacklinerItem(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    crossed_lines: int
    crossed_lines_last_30d: int
    longest_crossed: Optional[float] = None
    highest_crossed: Optional[float] = None


class SlacklinerListResponse(BaseModel):
    items: list[SlacklinerItem]
    total: int


class StyleCount(BaseModel):
    style: str
    count: int


class LengthBucket(BaseModel):
    bucket: str
    count: int


class HeightBucket(BaseModel):
    bucket: str
    count: int


class TopLine(BaseModel):
    id: int
    name: str
    crossing_count: int


class SlacklinerStats(BaseModel):
    total_lines: int
    total_crossings: int
    style_distribution: list[StyleCount]
    length_distribution: list[LengthBucket]
    height_distribution: list[HeightBucket]
    most_crossed: list[TopLine]


class SlacklinerLineItem(BaseModel):
    id: int
    name: str
    state: Optional[str] = None
    region: Optional[str] = None
    length: Optional[float] = None
    height: Optional[float] = None
    rating: Optional[int] = None
    last_crossing_date: Optional[str] = None
    crossing_count: int
    first_anchor: Optional[PointResponse] = None
    second_anchor: Optional[PointResponse] = None


class SlacklinerLinesResponse(BaseModel):
    items: list[SlacklinerLineItem]
    total: int
    page: int
    page_size: int
    pages: int


class SlacklinerUserInfo(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


# ── Helpers ────────────────────────────────────────────────────────────────────

KNOWN_STYLES = ["OS (on sight)", "AF (after fall)", "OW (one way)", "Flash", "Redpoint", "Unknown"]

LENGTH_ORDER = ["<20 m", "20–50 m", "50–100 m", "100–150 m", "150–200 m",
                "200–300 m", "300–500 m", "500–1000 m", ">1000 m", "Unknown"]

HEIGHT_ORDER = ["<2 m", "2–5 m", "5–10 m", "10–20 m", "20–30 m",
                "30–50 m", "50–80 m", ">80 m", "Unknown"]


async def build_user_stats(db: AsyncSession, user_id) -> SlacklinerStats:
    """Compute diary-style stats for any user id."""
    totals_q = (
        select(
            func.count(func.distinct(Crossing.slackline_id)).label("lines"),
            func.count(Crossing.id).label("crossings"),
        )
        .where(Crossing.user_id == user_id)
    )
    totals = (await db.execute(totals_q)).one()
    total_lines = totals.lines or 0
    total_crossings = totals.crossings or 0

    # Style distribution
    style_inner = (
        select(
            func.coalesce(func.nullif(Crossing.style, ""), "Unknown").label("style"),
        )
        .where(Crossing.user_id == user_id)
        .subquery()
    )
    style_q = (
        select(style_inner.c.style, func.count().label("cnt"))
        .group_by(style_inner.c.style)
        .order_by(func.count().desc())
    )
    style_rows = (await db.execute(style_q)).all()
    style_map = {r.style: r.cnt for r in style_rows}
    style_distribution = [StyleCount(style=s, count=style_map.get(s, 0)) for s in KNOWN_STYLES]

    # Length distribution
    length_case = case(
        (Slackline.length == None, "Unknown"),
        (Slackline.length < 20, "<20 m"),
        (Slackline.length < 50, "20–50 m"),
        (Slackline.length < 100, "50–100 m"),
        (Slackline.length < 150, "100–150 m"),
        (Slackline.length < 200, "150–200 m"),
        (Slackline.length < 300, "200–300 m"),
        (Slackline.length < 500, "300–500 m"),
        (Slackline.length < 1000, "500–1000 m"),
        else_=">1000 m",
    )
    length_inner = (
        select(Crossing.slackline_id, length_case.label("bucket"))
        .join(Slackline, Crossing.slackline_id == Slackline.id)
        .where(Crossing.user_id == user_id)
        .distinct()
        .subquery()
    )
    length_q = select(length_inner.c.bucket, func.count().label("cnt")).group_by(length_inner.c.bucket)
    length_rows = (await db.execute(length_q)).all()
    length_map = {r.bucket: r.cnt for r in length_rows}
    length_distribution = [LengthBucket(bucket=b, count=length_map[b]) for b in LENGTH_ORDER if b in length_map]

    # Height distribution
    height_case = case(
        (Slackline.height == None, "Unknown"),
        (Slackline.height < 2, "<2 m"),
        (Slackline.height < 5, "2–5 m"),
        (Slackline.height < 10, "5–10 m"),
        (Slackline.height < 20, "10–20 m"),
        (Slackline.height < 30, "20–30 m"),
        (Slackline.height < 50, "30–50 m"),
        (Slackline.height < 80, "50–80 m"),
        else_=">80 m",
    )
    height_inner = (
        select(Crossing.slackline_id, height_case.label("bucket"))
        .join(Slackline, Crossing.slackline_id == Slackline.id)
        .where(Crossing.user_id == user_id)
        .distinct()
        .subquery()
    )
    height_q = select(height_inner.c.bucket, func.count().label("cnt")).group_by(height_inner.c.bucket)
    height_rows = (await db.execute(height_q)).all()
    height_map = {r.bucket: r.cnt for r in height_rows}
    height_distribution = [HeightBucket(bucket=b, count=height_map[b]) for b in HEIGHT_ORDER if b in height_map]

    # Top 10 most crossed
    top_q = (
        select(Crossing.slackline_id, Slackline.name, func.count(Crossing.id).label("cnt"))
        .join(Slackline, Crossing.slackline_id == Slackline.id)
        .where(Crossing.user_id == user_id)
        .group_by(Crossing.slackline_id, Slackline.name)
        .order_by(func.count(Crossing.id).desc())
        .limit(10)
    )
    top_rows = (await db.execute(top_q)).all()
    most_crossed = [TopLine(id=r.slackline_id, name=r.name, crossing_count=r.cnt) for r in top_rows]

    return SlacklinerStats(
        total_lines=total_lines,
        total_crossings=total_crossings,
        style_distribution=style_distribution,
        length_distribution=length_distribution,
        height_distribution=height_distribution,
        most_crossed=most_crossed,
    )


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=SlacklinerListResponse)
async def list_slackliners(db: AsyncSession = Depends(get_db)):
    """Return all registered users with summary crossing stats."""
    cutoff = datetime.utcnow() - timedelta(days=30)

    # All users
    users_q = select(User).where(User.is_active == True).order_by(User.username)
    users = (await db.execute(users_q)).scalars().all()

    if not users:
        return SlacklinerListResponse(items=[], total=0)

    user_ids = [u.id for u in users]

    # Total crossed lines per user
    lines_q = (
        select(Crossing.user_id, func.count(func.distinct(Crossing.slackline_id)).label("cnt"))
        .where(Crossing.user_id.in_(user_ids))
        .group_by(Crossing.user_id)
    )
    lines_map = {r.user_id: r.cnt for r in (await db.execute(lines_q)).all()}

    # Lines crossed in last 30 days
    lines_30d_q = (
        select(Crossing.user_id, func.count(func.distinct(Crossing.slackline_id)).label("cnt"))
        .where(Crossing.user_id.in_(user_ids), Crossing.date >= cutoff.date())
        .group_by(Crossing.user_id)
    )
    lines_30d_map = {r.user_id: r.cnt for r in (await db.execute(lines_30d_q)).all()}

    # Longest crossed line per user
    longest_q = (
        select(Crossing.user_id, func.max(Slackline.length).label("max_len"))
        .join(Slackline, Crossing.slackline_id == Slackline.id)
        .where(Crossing.user_id.in_(user_ids))
        .group_by(Crossing.user_id)
    )
    longest_map = {r.user_id: float(r.max_len) if r.max_len else None
                   for r in (await db.execute(longest_q)).all()}

    # Highest crossed line per user
    highest_q = (
        select(Crossing.user_id, func.max(Slackline.height).label("max_h"))
        .join(Slackline, Crossing.slackline_id == Slackline.id)
        .where(Crossing.user_id.in_(user_ids))
        .group_by(Crossing.user_id)
    )
    highest_map = {r.user_id: float(r.max_h) if r.max_h else None
                   for r in (await db.execute(highest_q)).all()}

    items = [
        SlacklinerItem(
            id=str(u.id),
            username=u.username,
            display_name=u.display_name,
            avatar_url=u.avatar_url,
            crossed_lines=lines_map.get(u.id, 0),
            crossed_lines_last_30d=lines_30d_map.get(u.id, 0),
            longest_crossed=longest_map.get(u.id),
            highest_crossed=highest_map.get(u.id),
        )
        for u in users
    ]

    return SlacklinerListResponse(items=items, total=len(items))


@router.get("/{user_id}/stats", response_model=SlacklinerStats)
async def slackliner_stats(user_id: str, db: AsyncSession = Depends(get_db)):
    """Detailed crossing stats for a specific user."""
    import uuid as uuid_lib
    try:
        uid = uuid_lib.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found")

    user_q = select(User).where(User.id == uid)
    user = (await db.execute(user_q)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return await build_user_stats(db, uid)


@router.get("/{user_id}/info", response_model=SlacklinerUserInfo)
async def slackliner_info(user_id: str, db: AsyncSession = Depends(get_db)):
    """Basic info for a specific user."""
    import uuid as uuid_lib
    try:
        uid = uuid_lib.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found")

    user_q = select(User).where(User.id == uid)
    user = (await db.execute(user_q)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return SlacklinerUserInfo(
        id=str(user.id),
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
    )


@router.get("/{user_id}/lines", response_model=SlacklinerLinesResponse)
async def slackliner_lines(
    user_id: str,
    page: int = 1,
    page_size: int = 25,
    sort_by: str = "last_crossing_date",
    sort_dir: str = "desc",
    db: AsyncSession = Depends(get_db),
):
    """Return slacklines crossed by a specific user, paginated."""
    import uuid as uuid_lib
    try:
        uid = uuid_lib.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found")

    # Subquery: per-slackline stats for this user
    stats_sq = (
        select(
            Crossing.slackline_id,
            func.max(Crossing.date).label("last_date"),
            func.count(Crossing.id).label("cnt"),
        )
        .where(Crossing.user_id == uid)
        .group_by(Crossing.slackline_id)
        .subquery()
    )

    count_q = select(func.count()).select_from(stats_sq)
    total = (await db.execute(count_q)).scalar() or 0

    query = (
        select(Slackline, stats_sq.c.last_date, stats_sq.c.cnt)
        .join(stats_sq, Slackline.id == stats_sq.c.slackline_id)
        .options(selectinload(Slackline.components).selectinload(Component.point))
    )

    if sort_by == "last_crossing_date":
        order_col = stats_sq.c.last_date
    elif sort_by == "crossing_count":
        order_col = stats_sq.c.cnt
    elif sort_by in ("name", "state", "region", "length", "height", "rating"):
        order_col = getattr(Slackline, sort_by)
    else:
        order_col = stats_sq.c.last_date

    if sort_dir.lower() == "desc":
        query = query.order_by(order_col.desc().nullslast())
    else:
        query = query.order_by(order_col.asc().nullslast())

    query = query.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(query)).all()

    items = []
    for sl, last_date, cnt in rows:
        first_anchor = None
        second_anchor = None
        for comp in sl.components:
            if comp.point:
                pt = PointResponse(
                    id=comp.point.id,
                    description=comp.point.description,
                    latitude=float(comp.point.latitude),
                    longitude=float(comp.point.longitude),
                )
                if comp.component_type == "first_anchor_point":
                    first_anchor = pt
                elif comp.component_type == "second_anchor_point":
                    second_anchor = pt

        items.append(SlacklinerLineItem(
            id=sl.id,
            name=sl.name,
            state=sl.state,
            region=sl.region,
            length=float(sl.length) if sl.length else None,
            height=float(sl.height) if sl.height else None,
            rating=sl.rating,
            last_crossing_date=last_date.isoformat() if last_date else None,
            crossing_count=cnt or 0,
            first_anchor=first_anchor,
            second_anchor=second_anchor,
        ))

    return SlacklinerLinesResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 0,
    )


