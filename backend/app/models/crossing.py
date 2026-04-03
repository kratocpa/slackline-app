from __future__ import annotations

from typing import Optional

from datetime import date as DateType, datetime
import uuid
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Crossing(Base):
    __tablename__ = "crossings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slackline_id: Mapped[int] = mapped_column(Integer, ForeignKey("slacklines.id"), nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    date: Mapped[Optional[DateType]] = mapped_column(Date, nullable=True)
    style: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    accent_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    project: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    slackline = relationship("Slackline", back_populates="crossings")
    user = relationship("User", lazy="joined")
    __table_args__ = (
        Index("ix_crossings_slackline_id", "slackline_id"),
        Index("ix_crossings_user_id", "user_id"),
    )
