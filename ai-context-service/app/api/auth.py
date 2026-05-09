from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.auth_service import (
    check_login_lock,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    handle_login_fail,
    handle_login_success,
    verify_password,
)
from app.core.audit_service import log_action
from app.models.user import User

router = APIRouter(tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/auth/login")
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.username == body.username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(401, "Invalid username or password")

    # Check lock status before attempting password verification
    await check_login_lock(db, user)

    if not verify_password(body.password, user.password_hash):
        await handle_login_fail(db, user)
        raise HTTPException(401, "Invalid username or password")

    await handle_login_success(db, user)

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    # Audit log
    client_ip = request.client.host if request.client else None
    await log_action(
        db,
        user_id=user.id,
        action="login",
        target_type="user",
        target_id=str(user.id),
        detail={"username": user.username},
        client_ip=client_ip,
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "role": user.role,
        },
    }


@router.post("/auth/refresh")
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
    except Exception:
        raise HTTPException(401, "Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid token type")

    user_id = int(payload.get("sub", 0))
    user = await db.get(User, user_id)
    if not user or user.status != "active":
        raise HTTPException(401, "User not found or disabled")

    new_access_token = create_access_token(user.id, user.role)
    new_refresh_token = create_refresh_token(user.id)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
    }


@router.post("/auth/logout")
async def logout():
    # Simplified implementation: client clears tokens
    return {"message": "logged out"}


@router.get("/auth/me")
async def me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
