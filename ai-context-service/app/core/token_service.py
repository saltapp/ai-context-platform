import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_token import ApiToken

TOKEN_PREFIX = "ac_"
MAX_TOKENS_PER_USER = 3
RATE_LIMIT_PER_MINUTE = 30


def _generate_token() -> tuple[str, str, str]:
    raw = TOKEN_PREFIX + secrets.token_hex(32)
    token_hash = bcrypt.hashpw(raw.encode(), bcrypt.gensalt(12)).decode()
    token_prefix = raw[:8] + "****"
    return raw, token_hash, token_prefix


async def create_token(db: AsyncSession, user_id: int, name: str) -> dict:
    active_count = (
        await db.execute(
            select(func.count()).select_from(ApiToken).where(
                ApiToken.user_id == user_id, ApiToken.status == "active"
            )
        )
    ).scalar_one()

    if active_count >= MAX_TOKENS_PER_USER:
        raise ValueError(f"Max {MAX_TOKENS_PER_USER} active tokens allowed")

    raw, token_hash, token_prefix = _generate_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=90)

    token = ApiToken(
        user_id=user_id,
        name=name,
        token_hash=token_hash,
        token_prefix=token_prefix,
        expires_at=expires_at,
    )
    db.add(token)
    await db.commit()
    await db.refresh(token)

    return {
        "id": token.id,
        "token": raw,
        "token_prefix": token_prefix,
        "expires_at": token.expires_at.isoformat(),
    }


async def list_tokens(db: AsyncSession, user_id: int) -> list[ApiToken]:
    result = await db.execute(
        select(ApiToken)
        .where(ApiToken.user_id == user_id)
        .order_by(ApiToken.created_at.desc())
    )
    return list(result.scalars().all())


async def revoke_token(db: AsyncSession, token_id: int, user_id: int) -> None:
    token = await db.get(ApiToken, token_id)
    if not token or token.user_id != user_id:
        raise ValueError("Token not found")
    token.status = "revoked"
    await db.commit()


async def rotate_token(db: AsyncSession, token_id: int, user_id: int) -> dict:
    token = await db.get(ApiToken, token_id)
    if not token or token.user_id != user_id:
        raise ValueError("Token not found")

    raw, token_hash, token_prefix = _generate_token()
    token.token_hash = token_hash
    token.token_prefix = token_prefix
    token.expires_at = datetime.now(timezone.utc) + timedelta(days=90)
    await db.commit()
    await db.refresh(token)

    return {
        "id": token.id,
        "token": raw,
        "token_prefix": token_prefix,
        "expires_at": token.expires_at.isoformat(),
    }


async def delete_token(db: AsyncSession, token_id: int, user_id: int) -> None:
    token = await db.get(ApiToken, token_id)
    if not token or token.user_id != user_id:
        raise ValueError("Token not found")
    await db.delete(token)
    await db.commit()


async def verify_api_token(db: AsyncSession, raw_token: str) -> int | None:
    if not raw_token.startswith(TOKEN_PREFIX):
        return None

    result = await db.execute(
        select(ApiToken).where(
            ApiToken.status == "active",
            ApiToken.expires_at > datetime.now(timezone.utc),
        )
    )
    for token in result.scalars().all():
        if bcrypt.checkpw(raw_token.encode(), token.token_hash.encode()):
            token.last_used_at = datetime.now(timezone.utc)
            await db.commit()
            return token.user_id
    return None
