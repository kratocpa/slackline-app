from __future__ import annotations

from typing import Optional

from datetime import date, datetime
import uuid
from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
class Point(Base):
    __tablename__ = "points"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latitude: Mapped[float] = mapped_column(Numeric(10, 7), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(10, 7), nullable=False)
class Slackline(Base):
    __tablename__ = "slacklines"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    region: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sector: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    length: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    height: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    author: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    name_history: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date_tense: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    date_insertion: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    time_approach: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    time_tensioning: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    restriction: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    components: Mapped[list["Component"]] = relationship(back_populates="slackline", cascade="all, delete-orphan")
    crossings: Mapped[list["Crossing"]] = relationship(back_populates="slackline", cascade="all, delete-orphan")
    __table_args__ = (
        Index("ix_slacklines_state", "state"),
        Index("ix_slacklines_region", "region"),
        Index("ix_slacklines_sector", "sector"),
        Index("ix_slacklines_rating", "rating"),
    )
class Component(Base):
    __tablename__ = "components"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slackline_id: Mapped[int] = mapped_column(Integer, ForeignKey("slacklines.id"), nullable=False)
    point_id: Mapped[int] = mapped_column(Integer, ForeignKey("points.id"), nullable=False)
    component_type: Mapped[str] = mapped_column(String(50), nullable=False)
    field: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    slackline: Mapped["Slackline"] = relationship(back_populates="components")
    point: Mapped["Point"] = relationship()
    __table_args__ = (
        Index("ix_components_slackline_type", "slackline_id", "component_type"),
    )
