from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class SystemRelation(Base):
    __tablename__ = "system_relations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_system_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("systems.id", ondelete="CASCADE"), nullable=False
    )
    target_system_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("systems.id", ondelete="CASCADE"), nullable=False
    )
    relation_type: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # calls / depends_on / shared_data
    description: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    source_system = relationship(
        "System", foreign_keys=[source_system_id], back_populates="source_relations"
    )
    target_system = relationship(
        "System", foreign_keys=[target_system_id], back_populates="target_relations"
    )
