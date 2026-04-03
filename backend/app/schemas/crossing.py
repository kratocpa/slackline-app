from datetime import date as DateType, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from app.schemas.user import UserBrief


class CrossingItem(BaseModel):
    id: int
    slackline_id: int
    date: Optional[DateType] = None
    style: Optional[str] = None
    accent_description: Optional[str] = None
    rating: Optional[int] = None
    image_url: Optional[str] = None
    project: Optional[bool] = None
    user: Optional[UserBrief] = None
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class CrossingCreate(BaseModel):
    date: Optional[DateType] = None
    style: Optional[str] = None
    accent_description: Optional[str] = None
    rating: Optional[int] = None
    project: Optional[bool] = None


class CrossingUpdate(BaseModel):
    date: Optional[DateType] = None
    style: Optional[str] = None
    accent_description: Optional[str] = None
    rating: Optional[int] = None
    project: Optional[bool] = None


class CrossingListResponse(BaseModel):
    items: list[CrossingItem]
    total: int
    page: int
    page_size: int
    pages: int


class StatisticsResponse(BaseModel):
    total_crossings: int
    style_distribution: list[dict]
    top_users: list[dict]
    average_rating: Optional[float] = None
