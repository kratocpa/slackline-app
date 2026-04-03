from typing import Optional

import math
from datetime import datetime
from loguru import logger
from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.slackline import Component, Point, Slackline
from app.models.user import User
from app.schemas.slackline import (
    PointCreate,
    PointResponse,
    SlacklineCreate,
    SlacklineDetail,
    SlacklineListItem,
    SlacklineListResponse,
    SlacklineUpdate,
)
FIELD_MAP = {
    "first_anchor_point": "first_anchor_point",
    "second_anchor_point": "second_anchor_point",
    "parking_spot": "parking_spot",
}
async def get_slacklines(
    db: AsyncSession,
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
) -> SlacklineListResponse:
    query = select(Slackline).options(
        selectinload(Slackline.components).selectinload(Component.point)
    )
    # Search
    if search:
        search_filter = or_(
            Slackline.name.ilike(f"%{search}%"),
            Slackline.description.ilike(f"%{search}%"),
            Slackline.sector.ilike(f"%{search}%"),
            Slackline.region.ilike(f"%{search}%"),
            Slackline.author.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
    # Filters
    if state:
        query = query.where(Slackline.state == state)
    if region:
        query = query.where(Slackline.region == region)
    if sector:
        query = query.where(Slackline.sector == sector)
    if min_length is not None:
        query = query.where(Slackline.length >= min_length)
    if max_length is not None:
        query = query.where(Slackline.length <= max_length)
    if min_height is not None:
        query = query.where(Slackline.height >= min_height)
    if max_height is not None:
        query = query.where(Slackline.height <= max_height)
    if min_rating is not None:
        query = query.where(Slackline.rating >= min_rating)
    # Bounds filter (sw_lat,sw_lon,ne_lat,ne_lon)
    if bounds:
        try:
            sw_lat, sw_lon, ne_lat, ne_lon = [float(x) for x in bounds.split(",")]
            # Join with components to filter by point location
            query = query.where(
                Slackline.id.in_(
                    select(Component.slackline_id)
                    .join(Point, Component.point_id == Point.id)
                    .where(
                        Component.component_type == "first_anchor_point",
                        Point.latitude >= sw_lat,
                        Point.latitude <= ne_lat,
                        Point.longitude >= sw_lon,
                        Point.longitude <= ne_lon,
                    )
                )
            )
        except (ValueError, TypeError):
            logger.warning(f"Invalid bounds parameter: {bounds}")
    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    # Sorting
    sort_column = getattr(Slackline, sort_by, Slackline.name)
    if sort_dir.lower() == "desc":
        query = query.order_by(sort_column.desc().nullslast())
    else:
        query = query.order_by(sort_column.asc().nullslast())
    # Pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    slacklines = result.scalars().unique().all()
    items = []
    for sl in slacklines:
        first_anchor = None
        second_anchor = None
        for comp in sl.components:
            if comp.component_type == "first_anchor_point" and comp.point:
                first_anchor = PointResponse(
                    id=comp.point.id,
                    description=comp.point.description,
                    latitude=float(comp.point.latitude),
                    longitude=float(comp.point.longitude),
                )
            elif comp.component_type == "second_anchor_point" and comp.point:
                second_anchor = PointResponse(
                    id=comp.point.id,
                    description=comp.point.description,
                    latitude=float(comp.point.latitude),
                    longitude=float(comp.point.longitude),
                )
        items.append(
            SlacklineListItem(
                id=sl.id,
                name=sl.name,
                state=sl.state,
                region=sl.region,
                length=float(sl.length) if sl.length else None,
                height=float(sl.height) if sl.height else None,
                rating=sl.rating,
                date_tense=sl.date_tense,
                first_anchor=first_anchor,
                second_anchor=second_anchor,
            )
        )
    return SlacklineListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 0,
    )
async def get_slackline_detail(db: AsyncSession, slackline_id: int) -> Optional[SlacklineDetail]:
    query = (
        select(Slackline)
        .options(selectinload(Slackline.components).selectinload(Component.point))
        .where(Slackline.id == slackline_id)
    )
    result = await db.execute(query)
    sl = result.scalar_one_or_none()
    if not sl:
        return None
    first_anchor = None
    second_anchor = None
    parking = None
    for comp in sl.components:
        if comp.point:
            point_resp = PointResponse(
                id=comp.point.id,
                description=comp.point.description,
                latitude=float(comp.point.latitude),
                longitude=float(comp.point.longitude),
            )
            if comp.component_type == "first_anchor_point":
                first_anchor = point_resp
            elif comp.component_type == "second_anchor_point":
                second_anchor = point_resp
            elif comp.component_type == "parking_spot":
                parking = point_resp
    return SlacklineDetail(
        id=sl.id,
        name=sl.name,
        description=sl.description,
        state=sl.state,
        region=sl.region,
        sector=sl.sector,
        length=float(sl.length) if sl.length else None,
        height=float(sl.height) if sl.height else None,
        author=sl.author,
        name_history=sl.name_history,
        date_tense=sl.date_tense,
        time_approach=sl.time_approach,
        time_tensioning=sl.time_tensioning,
        rating=sl.rating,
        cover_image_url=sl.cover_image_url,
        restriction=sl.restriction,
        type=sl.type,
        created_at=sl.created_at,
        updated_at=sl.updated_at,
        created_by_id=sl.created_by_id,
        updated_by_id=sl.updated_by_id,
        first_anchor_point=first_anchor,
        second_anchor_point=second_anchor,
        parking_spot=parking,
    )
async def create_slackline(
    db: AsyncSession, data: SlacklineCreate, user: User, cover_image_url: Optional[str] = None
) -> Slackline:
    sl = Slackline(
        name=data.name,
        description=data.description,
        state=data.state,
        region=data.region,
        sector=data.sector,
        length=data.length,
        height=data.height,
        author=data.author,
        name_history=data.name_history,
        date_tense=data.date_tense,
        time_approach=data.time_approach,
        time_tensioning=data.time_tensioning,
        rating=data.rating,
        restriction=data.restriction,
        type=data.type,
        cover_image_url=cover_image_url,
        created_by_id=user.id,
        updated_by_id=user.id,
    )
    db.add(sl)
    await db.flush()
    # Create anchor points
    for field_name, comp_type in [
        ("first_anchor_point", "first_anchor_point"),
        ("second_anchor_point", "second_anchor_point"),
        ("parking_spot", "parking_spot"),
    ]:
        point_data: Optional[PointCreate] = getattr(data, field_name)
        if point_data:
            point = Point(
                description=point_data.description,
                latitude=point_data.latitude,
                longitude=point_data.longitude,
            )
            db.add(point)
            await db.flush()
            comp = Component(
                slackline_id=sl.id,
                point_id=point.id,
                component_type=comp_type,
                field=field_name,
                order=0,
            )
            db.add(comp)
    await db.flush()
    return sl
async def update_slackline(
    db: AsyncSession, slackline_id: int, data: SlacklineUpdate, user: User,
    cover_image_url: Optional[str] = None
) -> tuple[Optional[Slackline], dict]:
    result = await db.execute(
        select(Slackline)
        .options(selectinload(Slackline.components).selectinload(Component.point))
        .where(Slackline.id == slackline_id)
    )
    sl = result.scalar_one_or_none()
    if not sl:
        return None, {}
    changes = {}
    update_data = data.model_dump(exclude_unset=True)
    # Handle point updates separately
    point_fields = {"first_anchor_point", "second_anchor_point", "parking_spot"}
    for field_name in point_fields:
        if field_name in update_data and update_data[field_name] is not None:
            point_data = update_data.pop(field_name)
            # Find existing component
            existing_comp = None
            for comp in sl.components:
                if comp.component_type == field_name:
                    existing_comp = comp
                    break
            if existing_comp and existing_comp.point:
                old_lat = float(existing_comp.point.latitude)
                old_lon = float(existing_comp.point.longitude)
                existing_comp.point.latitude = point_data["latitude"]
                existing_comp.point.longitude = point_data["longitude"]
                existing_comp.point.description = point_data.get("description")
                if old_lat != point_data["latitude"] or old_lon != point_data["longitude"]:
                    changes[field_name] = {
                        "old": {"lat": old_lat, "lon": old_lon},
                        "new": {"lat": point_data["latitude"], "lon": point_data["longitude"]},
                    }
            else:
                point = Point(
                    description=point_data.get("description"),
                    latitude=point_data["latitude"],
                    longitude=point_data["longitude"],
                )
                db.add(point)
                await db.flush()
                comp = Component(
                    slackline_id=sl.id,
                    point_id=point.id,
                    component_type=field_name,
                    field=field_name,
                    order=0,
                )
                db.add(comp)
                changes[field_name] = {
                    "old": None,
                    "new": {"lat": point_data["latitude"], "lon": point_data["longitude"]},
                }
        elif field_name in update_data:
            update_data.pop(field_name)
    # Update scalar fields
    for key, value in update_data.items():
        old_value = getattr(sl, key)
        if old_value != value:
            old_str = str(old_value) if old_value is not None else None
            new_str = str(value) if value is not None else None
            changes[key] = {"old": old_str, "new": new_str}
            setattr(sl, key, value)
    sl.updated_by_id = user.id
    sl.updated_at = datetime.utcnow()
    if cover_image_url:
        sl.cover_image_url = cover_image_url
    await db.flush()
    return sl, changes
