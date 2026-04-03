
import math
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.models.history import ChangeHistory
from app.models.user import User
from app.schemas.history import ChangeHistoryItem, ChangeHistoryResponse
from app.schemas.user import UserBrief
async def record_change(
    db: AsyncSession,
    entity_type: str,
    entity_id: int,
    user: User,
    changes: dict,
) -> ChangeHistory:
    if not changes:
        return None
    history = ChangeHistory(
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user.id,
        changes=changes,
    )
    db.add(history)
    await db.flush()
    return history
async def get_history(
    db: AsyncSession,
    entity_type: str,
    entity_id: int,
    page: int = 1,
    page_size: int = 20,
) -> ChangeHistoryResponse:
    base_query = select(ChangeHistory).where(
        ChangeHistory.entity_type == entity_type,
        ChangeHistory.entity_id == entity_id,
    )
    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar() or 0
    query = (
        base_query.options(joinedload(ChangeHistory.user))
        .order_by(ChangeHistory.changed_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items_raw = result.scalars().unique().all()
    items = []
    for h in items_raw:
        user_brief = None
        if h.user:
            user_brief = UserBrief(
                id=h.user.id,
                username=h.user.username,
                avatar_url=h.user.avatar_url,
            )
        items.append(
            ChangeHistoryItem(
                id=h.id,
                entity_type=h.entity_type,
                entity_id=h.entity_id,
                user=user_brief,
                changed_at=h.changed_at,
                changes=h.changes,
            )
        )
    return ChangeHistoryResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 0,
    )
