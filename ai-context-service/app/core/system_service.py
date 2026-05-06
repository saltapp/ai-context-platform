import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.bridge.gitnexus_bridge import bridge
from app.config import settings
from app.core.encryption import encrypt
from app.core.quota_service import check_system_quota
from app.models.base import gen_id
from app.models.system import System
from app.models.system_relation import SystemRelation

logger = logging.getLogger("ai-context-service.system")


class SystemService:
    @staticmethod
    async def create_system(
        db: AsyncSession,
        name: str,
        group_name: str | None = None,
        description: str | None = None,
        owner: str | None = None,
        gitlab_username: str | None = None,
        gitlab_token: str | None = None,
        created_by: int | None = None,
    ) -> System:
        if created_by is not None:
            await check_system_quota(db, created_by)

        encrypted_token = encrypt(gitlab_token) if gitlab_token else None

        system = System(
            id=gen_id(),
            name=name,
            group_name=group_name or name,
            description=description,
            owner=owner,
            gitlab_username=gitlab_username,
            gitlab_token=encrypted_token,
            created_by=created_by,
        )
        db.add(system)
        await db.commit()
        await db.refresh(system)

        try:
            await bridge.group_create(system.group_name)
        except Exception:
            logger.warning(f"Failed to create GitNexus group '{system.group_name}', continuing")

        return system

    @staticmethod
    async def list_systems(db: AsyncSession, skip: int = 0, limit: int = 50) -> list[System]:
        stmt = (
            select(System)
            .options(selectinload(System.apps))
            .where(System.deleted == False)  # noqa: E712
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_system(db: AsyncSession, system_id: str) -> System | None:
        stmt = (
            select(System)
            .options(selectinload(System.apps), selectinload(System.source_relations))
            .where(System.id == system_id, System.deleted == False)  # noqa: E712
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_system(db: AsyncSession, system_id: str, **kwargs) -> System | None:
        system = await SystemService.get_system(db, system_id)
        if not system:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(system, key):
                setattr(system, key, value)
        await db.commit()
        await db.refresh(system)
        return system

    @staticmethod
    async def update_gitlab_credentials(
        db: AsyncSession, system_id: str, gitlab_username: str, gitlab_token: str
    ) -> System | None:
        system = await SystemService.get_system(db, system_id)
        if not system:
            return None
        system.gitlab_username = gitlab_username
        system.gitlab_token = encrypt(gitlab_token)
        await db.commit()
        await db.refresh(system)
        return system

    @staticmethod
    async def delete_system(db: AsyncSession, system_id: str) -> bool:
        system = await SystemService.get_system(db, system_id)
        if not system:
            return False
        system.deleted = True

        # Cascade soft-delete all apps under this system
        stmt = select(System).where(System.id == system_id).options(selectinload(System.apps))
        result = await db.execute(stmt)
        fresh = result.scalar_one_or_none()
        if fresh:
            for app in fresh.apps:
                if not app.deleted:
                    app.deleted = True

        await db.commit()
        return True

    @staticmethod
    async def add_relation(
        db: AsyncSession,
        source_system_id: str,
        target_system_id: str,
        relation_type: str,
        description: str | None = None,
    ) -> SystemRelation:
        rel = SystemRelation(
            source_system_id=source_system_id,
            target_system_id=target_system_id,
            relation_type=relation_type,
            description=description,
        )
        db.add(rel)
        await db.commit()
        await db.refresh(rel)
        return rel

    @staticmethod
    async def list_relations(db: AsyncSession, system_id: str) -> list[SystemRelation]:
        stmt = (
            select(SystemRelation)
            .where(
                (SystemRelation.source_system_id == system_id)
                | (SystemRelation.target_system_id == system_id)
            )
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def remove_relation(db: AsyncSession, source_id: str, target_id: str) -> bool:
        stmt = select(SystemRelation).where(
            SystemRelation.source_system_id == source_id,
            SystemRelation.target_system_id == target_id,
        )
        result = await db.execute(stmt)
        rel = result.scalar_one_or_none()
        if not rel:
            return False
        await db.delete(rel)
        await db.commit()
        return True
