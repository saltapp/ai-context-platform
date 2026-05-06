from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import JSON

from .base import Base


class IndexJob(Base):
    __tablename__ = "index_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    app_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("apps.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(16), default="pending"
    )  # pending/running/success/failed/cancelled
    trigger_type: Mapped[str] = mapped_column(
        String(16), default="manual"
    )  # manual/webhook
    cancel_reason: Mapped[str | None] = mapped_column(String(256), nullable=True)
    commit_hash: Mapped[str | None] = mapped_column(String(40), nullable=True)
    include_wiki: Mapped[bool] = mapped_column(Boolean, default=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    stats: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    app = relationship("App", back_populates="index_jobs")
