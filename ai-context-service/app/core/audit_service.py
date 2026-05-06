import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog

logger = logging.getLogger("audit")


async def log_action(
    db: AsyncSession,
    *,
    user_id: int | None = None,
    action: str,
    target_type: str | None = None,
    target_id: str | None = None,
    detail: dict | None = None,
    source: str = "web",
    client_ip: str | None = None,
) -> None:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail,
        source=source,
        client_ip=client_ip,
    )
    db.add(entry)
    await db.commit()
    logger.info(f"AUDIT user={user_id} action={action} target={target_type}:{target_id}")
