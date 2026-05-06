from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.app import App
from app.models.document import Document
from app.models.system import System
from app.models.user import User


async def check_system_quota(db: AsyncSession, user_id: int) -> None:
    user = await db.get(User, user_id)
    if not user:
        raise ValueError("User not found")

    count = (
        await db.execute(
            select(func.count()).select_from(System).where(
                System.created_by == user_id, System.deleted == False  # noqa: E712
            )
        )
    ).scalar_one()

    if count >= user.system_quota:
        raise ValueError(f"System quota exceeded (max {user.system_quota})")


async def check_app_quota(db: AsyncSession, system_id: str) -> None:
    count = (
        await db.execute(
            select(func.count()).select_from(App).where(
                App.system_id == system_id, App.deleted == False  # noqa: E712
            )
        )
    ).scalar_one()

    if count >= 20:
        raise ValueError("App quota exceeded (max 20 per system)")


async def check_document_quota(db: AsyncSession, system_id: str, app_id: str | None) -> None:
    if app_id:
        q = select(func.count()).select_from(Document).where(
            Document.app_id == app_id, Document.deleted == False  # noqa: E712
        )
    else:
        q = select(func.count()).select_from(Document).where(
            Document.system_id == system_id,
            Document.app_id.is_(None),
            Document.deleted == False,  # noqa: E712
        )

    count = (await db.execute(q)).scalar_one()
    if count >= 50:
        raise ValueError("Document quota exceeded (max 50)")
