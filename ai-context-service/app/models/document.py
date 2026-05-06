from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, gen_id


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_id)
    system_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("systems.id", ondelete="CASCADE"), nullable=False
    )
    app_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("apps.id", ondelete="CASCADE"), nullable=True
    )
    doc_type: Mapped[str] = mapped_column(String(32), default="other")
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    file_name: Mapped[str] = mapped_column(String(256), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, default=0)
    s3_key: Mapped[str] = mapped_column(String(512), nullable=False)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    ragflow_dataset: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ragflow_document: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    system = relationship("System", back_populates="documents")
    app = relationship("App", back_populates="documents")
