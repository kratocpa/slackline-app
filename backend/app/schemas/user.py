from typing import Optional

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
class UserBase(BaseModel):
    email: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}
class UserBrief(BaseModel):
    id: UUID
    username: str
    avatar_url: Optional[str] = None
    model_config = {"from_attributes": True}
