import json
import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.auth_service import User, get_current_user, require_admin
from app.core.audit_service import log_action
from app.models.api_token import ApiToken
from app.models.audit_log import AuditLog
from app.models.user import User as UserModel

router = APIRouter(tags=["admin"])


class UserCreateRequest(BaseModel):
    username: str
    password: str
    display_name: str | None = None
    role: str = "user"


class UserStatusUpdate(BaseModel):
    status: str  # active / disabled


@router.get("/admin/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    stmt = select(UserModel).order_by(UserModel.id)
    result = await db.execute(stmt)
    users = list(result.scalars().all())
    return [
        {
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "role": u.role,
            "status": u.status,
            "system_quota": u.system_quota,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("/admin/users", status_code=201)
async def create_user(
    body: UserCreateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    # Check username uniqueness
    stmt = select(UserModel).where(UserModel.username == body.username)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(400, "Username already exists")

    from app.core.auth_service import hash_password

    user = UserModel(
        username=body.username,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        role=body.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await log_action(
        db,
        user_id=admin.id,
        action="user_create",
        target_type="user",
        target_id=str(user.id),
        detail={"username": user.username, "role": user.role},
    )

    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "role": user.role,
        "status": user.status,
    }


@router.put("/admin/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    body: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if body.status not in ("active", "disabled"):
        raise HTTPException(400, "status must be 'active' or 'disabled'")

    # Cannot disable self
    if admin.id == user_id:
        raise HTTPException(400, "Cannot change your own status")

    user = await db.get(UserModel, user_id)
    if not user:
        raise HTTPException(404, "User not found")

    user.status = body.status

    # When disabling: revoke all active API tokens for this user
    if body.status == "disabled":
        stmt = (
            update(ApiToken)
            .where(ApiToken.user_id == user_id, ApiToken.status == "active")
            .values(status="revoked")
        )
        await db.execute(stmt)

    await db.commit()

    await log_action(
        db,
        user_id=admin.id,
        action="user_status_update",
        target_type="user",
        target_id=str(user_id),
        detail={"new_status": body.status},
    )

    return {
        "id": user.id,
        "username": user.username,
        "status": user.status,
    }


@router.get("/admin/audit-logs")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    username: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    # Resolve username → user_id if provided
    user_id_filter = None
    if username:
        u = await db.execute(select(UserModel).where(UserModel.username == username))
        user_obj = u.scalar_one_or_none()
        if user_obj:
            user_id_filter = user_obj.id
        else:
            # Username not found → return empty
            return {"total": 0, "page": page, "page_size": page_size, "total_pages": 0, "items": []}

    # Build query with filters
    stmt = select(AuditLog)
    count_stmt = select(func.count()).select_from(AuditLog)

    if user_id_filter is not None:
        stmt = stmt.where(AuditLog.user_id == user_id_filter)
        count_stmt = count_stmt.where(AuditLog.user_id == user_id_filter)
    if action:
        stmt = stmt.where(AuditLog.action == action)
        count_stmt = count_stmt.where(AuditLog.action == action)
    if target_type:
        stmt = stmt.where(AuditLog.target_type == target_type)
        count_stmt = count_stmt.where(AuditLog.target_type == target_type)
    if start_date:
        sd = datetime.fromisoformat(start_date)
        stmt = stmt.where(AuditLog.created_at >= sd)
        count_stmt = count_stmt.where(AuditLog.created_at >= sd)
    if end_date:
        ed = datetime.fromisoformat(end_date + "T23:59:59")
        stmt = stmt.where(AuditLog.created_at <= ed)
        count_stmt = count_stmt.where(AuditLog.created_at <= ed)

    # Total count
    total = (await db.execute(count_stmt)).scalar_one()

    # Paginated results
    stmt = stmt.order_by(AuditLog.id.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    logs = list(result.scalars().all())

    # Resolve user_id → username for all logs
    user_ids = {log.user_id for log in logs if log.user_id}
    user_map = {}
    if user_ids:
        u_result = await db.execute(select(UserModel).where(UserModel.id.in_(user_ids)))
        for u in u_result.scalars().all():
            user_map[u.id] = u.username

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "items": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "username": user_map.get(log.user_id) if log.user_id else None,
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "details": json.dumps(log.detail, ensure_ascii=False) if log.detail else None,
                "source": log.source,
                "ip_address": log.client_ip,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }
