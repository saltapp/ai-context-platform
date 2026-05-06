import logging
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.config import settings
from app.models.user import User

logger = logging.getLogger("auth")

ALGORITHM = "HS256"
LOGIN_MAX_FAIL = 5
LOGIN_LOCK_MINUTES = 15

security = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "role": role, "type": "access", "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "type": "refresh", "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])


async def check_login_lock(db: AsyncSession, user: User) -> None:
    if user.status == "disabled":
        raise HTTPException(401, "该账户已被禁用，请联系管理员")

    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() / 60)
        raise HTTPException(429, f"账户已锁定，请 {remaining} 分钟后重试")


async def handle_login_fail(db: AsyncSession, user: User) -> None:
    user.login_fail_count += 1
    if user.login_fail_count >= LOGIN_MAX_FAIL:
        user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOGIN_LOCK_MINUTES)
        logger.warning(f"User {user.username} locked until {user.locked_until}")
    await db.commit()


async def handle_login_success(db: AsyncSession, user: User) -> None:
    user.login_fail_count = 0
    user.locked_until = None
    await db.commit()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials

    # Try API Token first (ac_ prefix)
    if token.startswith("ac_"):
        from app.core.token_service import verify_api_token

        user_id = await verify_api_token(db, token)
        if user_id:
            user = await db.get(User, user_id)
            if user and user.status == "active":
                return user
        raise HTTPException(401, "Invalid API token")

    # JWT token
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user_id = int(payload.get("sub", 0))
    except (JWTError, ValueError):
        raise HTTPException(401, "Invalid token")

    user = await db.get(User, user_id)
    if not user or user.status != "active":
        raise HTTPException(401, "User not found or disabled")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    return user


def can_modify(user: User, created_by: int | None) -> bool:
    return created_by is not None and user.id == created_by
