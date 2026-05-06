from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, gen_id


class System(TimestampMixin, Base):
    __tablename__ = "systems"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_id)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    group_name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner: Mapped[str | None] = mapped_column(String(64), nullable=True)
    gitlab_username: Mapped[str | None] = mapped_column(String(128), nullable=True)
    gitlab_token: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    apps = relationship("App", back_populates="system", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="system", cascade="all, delete-orphan")
    source_relations = relationship(
        "SystemRelation",
        foreign_keys="SystemRelation.source_system_id",
        back_populates="source_system",
        cascade="all, delete-orphan",
    )
    target_relations = relationship(
        "SystemRelation",
        foreign_keys="SystemRelation.target_system_id",
        back_populates="target_system",
        cascade="all, delete-orphan",
    )
