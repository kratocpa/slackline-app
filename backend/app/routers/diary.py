from typing import Optional
import math

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, case
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_current_user
from app.models.crossing import Crossing
from app.models.slackline import Component, Point, Slackline
from app.models.user import User
from app.schemas.slackline import PointResponse
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/diary", tags=["diary"])


class DiaryItem(BaseModel):
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


class DiaryResponse(BaseModel):
    items: list[DiaryItem]
    total: int
    page: int
    page_size: int
    pages: int


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


class DiaryStats(BaseModel):
    total_lines: int
    total_crossings: int
    style_distribution: list[StyleCount]
    length_distribution: list[LengthBucket]
    height_distribution: list[HeightBucket]
    most_crossed: list[TopLine]


@router.get("/stats", response_model=DiaryStats)
async def get_diary_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return aggregate statistics for the current user's diary."""

    # Total distinct lines & total crossings
    totals_q = (
        select(
            func.count(func.distinct(Crossing.slackline_id)).label("lines"),
            func.count(Crossing.id).label("crossings"),
        )
        .where(Crossing.user_id == user.id)
    )
    totals = (await db.execute(totals_q)).one()
    total_lines = totals.lines or 0
    total_crossings = totals.crossings or 0

    # Style distribution (NULL style → "Unknown")
    # Use a subquery so we can GROUP BY the aliased column
    # Style distribution — always show all known styles, fill zeros for missing
    KNOWN_STYLES = ["OS (on sight)", "AF (after fall)", "OW (one way)", "Flash", "Redpoint", "Unknown"]
    style_inner = (
        select(
            func.coalesce(func.nullif(Crossing.style, ""), "Unknown").label("style"),
        )
        .where(Crossing.user_id == user.id)
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

    # Length distribution – more granular buckets
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
        select(
            Crossing.slackline_id,
            length_case.label("bucket"),
        )
        .join(Slackline, Crossing.slackline_id == Slackline.id)
        .where(Crossing.user_id == user.id)
        .distinct()
        .subquery()
    )
    length_q = (
        select(length_inner.c.bucket, func.count().label("cnt"))
        .group_by(length_inner.c.bucket)
    )
    length_rows = (await db.execute(length_q)).all()
    length_order = ["<20 m", "20–50 m", "50–100 m", "100–150 m", "150–200 m", "200–300 m", "300–500 m", "500–1000 m", ">1000 m", "Unknown"]
    length_map = {r.bucket: r.cnt for r in length_rows}
    length_distribution = [
        LengthBucket(bucket=b, count=length_map[b])
        for b in length_order if b in length_map
    ]

    # Height distribution – more granular buckets
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
        select(
            Crossing.slackline_id,
            height_case.label("bucket"),
        )
        .join(Slackline, Crossing.slackline_id == Slackline.id)
        .where(Crossing.user_id == user.id)
        .distinct()
        .subquery()
    )
    height_q = (
        select(height_inner.c.bucket, func.count().label("cnt"))
        .group_by(height_inner.c.bucket)
    )
    height_rows = (await db.execute(height_q)).all()
    height_order = ["<2 m", "2–5 m", "5–10 m", "10–20 m", "20–30 m", "30–50 m", "50–80 m", ">80 m", "Unknown"]
    height_map = {r.bucket: r.cnt for r in height_rows}
    height_distribution = [
        HeightBucket(bucket=b, count=height_map[b])
        for b in height_order if b in height_map
    ]

    # Top 10 most crossed lines
    top_q = (
        select(
            Crossing.slackline_id,
            Slackline.name,
            func.count(Crossing.id).label("cnt"),
        )
        .join(Slackline, Crossing.slackline_id == Slackline.id)
        .where(Crossing.user_id == user.id)
        .group_by(Crossing.slackline_id, Slackline.name)
        .order_by(func.count(Crossing.id).desc())
        .limit(10)
    )
    top_rows = (await db.execute(top_q)).all()
    most_crossed = [TopLine(id=r.slackline_id, name=r.name, crossing_count=r.cnt) for r in top_rows]

    return DiaryStats(
        total_lines=total_lines,
        total_crossings=total_crossings,
        style_distribution=style_distribution,
        length_distribution=length_distribution,
        height_distribution=height_distribution,
        most_crossed=most_crossed,
    )



@router.get("", response_model=DiaryResponse)
async def get_diary(
    page: int = 1,
    page_size: int = 25,
    sort_by: str = "last_crossing_date",
    sort_dir: str = "desc",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return slacklines that the current user has crossed, with crossing stats."""

    # Subquery: per-slackline stats for this user
    stats_sq = (
        select(
            Crossing.slackline_id,
            func.max(Crossing.date).label("last_date"),
            func.count(Crossing.id).label("cnt"),
        )
        .where(Crossing.user_id == user.id)
        .group_by(Crossing.slackline_id)
        .subquery()
    )

    # Count distinct slacklines
    count_q = select(func.count()).select_from(stats_sq)
    total = (await db.execute(count_q)).scalar() or 0

    # Join slacklines with stats
    query = (
        select(Slackline, stats_sq.c.last_date, stats_sq.c.cnt)
        .join(stats_sq, Slackline.id == stats_sq.c.slackline_id)
        .options(selectinload(Slackline.components).selectinload(Component.point))
    )

    # Sorting
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

        items.append(DiaryItem(
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

    return DiaryResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 0,
    )

