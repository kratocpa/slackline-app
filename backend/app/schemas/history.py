from typing import Optional

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from app.schemas.user import UserBrief
class ChangeHistoryItem(BaseModel):
    id: UUID
    entity_type: str
    entity_id: int
    user: Optional[UserBrief] = None
    changed_at: datetime
    changes: dict
    model_config = {"from_attributes": True}
class ChangeHistoryResponse(BaseModel):
    items: list[ChangeHistoryItem]
    total: int
    page: int
    page_size: int
    pages: int
