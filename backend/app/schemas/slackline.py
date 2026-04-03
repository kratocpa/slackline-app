from typing import Optional

from datetime import date as DateType, datetime
from uuid import UUID
from pydantic import BaseModel


class PointResponse(BaseModel):
    id: int
    description: Optional[str] = None
    latitude: float
    longitude: float
    model_config = {"from_attributes": True}


class PointCreate(BaseModel):
    description: Optional[str] = None
    latitude: float
    longitude: float


class SlacklineListItem(BaseModel):
    id: int
    name: str
    state: Optional[str] = None
    region: Optional[str] = None
    length: Optional[float] = None
    height: Optional[float] = None
    rating: Optional[int] = None
    date_tense: Optional[DateType] = None
    first_anchor: Optional[PointResponse] = None
    second_anchor: Optional[PointResponse] = None
    model_config = {"from_attributes": True}


class SlacklineDetail(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    state: Optional[str] = None
    region: Optional[str] = None
    sector: Optional[str] = None
    length: Optional[float] = None
    height: Optional[float] = None
    author: Optional[str] = None
    name_history: Optional[str] = None
    date_tense: Optional[DateType] = None
    time_approach: Optional[str] = None
    time_tensioning: Optional[str] = None
    rating: Optional[int] = None
    cover_image_url: Optional[str] = None
    restriction: Optional[str] = None
    type: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[UUID] = None
    updated_by_id: Optional[UUID] = None
    first_anchor_point: Optional[PointResponse] = None
    second_anchor_point: Optional[PointResponse] = None
    parking_spot: Optional[PointResponse] = None
    model_config = {"from_attributes": True}


class SlacklineCreate(BaseModel):
    name: str
    description: Optional[str] = None
    state: Optional[str] = None
    region: Optional[str] = None
    sector: Optional[str] = None
    length: Optional[float] = None
    height: Optional[float] = None
    author: Optional[str] = None
    name_history: Optional[str] = None
    date_tense: Optional[DateType] = None
    time_approach: Optional[str] = None
    time_tensioning: Optional[str] = None
    rating: Optional[int] = None
    restriction: Optional[str] = None
    type: Optional[str] = None
    first_anchor_point: Optional[PointCreate] = None
    second_anchor_point: Optional[PointCreate] = None
    parking_spot: Optional[PointCreate] = None


class SlacklineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    state: Optional[str] = None
    region: Optional[str] = None
    sector: Optional[str] = None
    length: Optional[float] = None
    height: Optional[float] = None
    author: Optional[str] = None
    name_history: Optional[str] = None
    date_tense: Optional[DateType] = None
    time_approach: Optional[str] = None
    time_tensioning: Optional[str] = None
    rating: Optional[int] = None
    restriction: Optional[str] = None
    type: Optional[str] = None
    first_anchor_point: Optional[PointCreate] = None
    second_anchor_point: Optional[PointCreate] = None
    parking_spot: Optional[PointCreate] = None


class SlacklineListResponse(BaseModel):
    items: list[SlacklineListItem]
    total: int
    page: int
    page_size: int
    pages: int
