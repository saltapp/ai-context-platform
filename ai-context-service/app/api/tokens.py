from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.auth_service import User, get_current_user
from app.core.audit_service import log_action
from app.core import token_service

router = APIRouter(tags=["tokens"])


class TokenCreateRequest(BaseModel):
    name: str


@router.post("/tokens", status_code=201)
async def create_token(
    body: TokenCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        result = await token_service.create_token(db, user.id, body.name)
    except ValueError as e:
        raise HTTPException(400, str(e))

    await log_action(
        db,
        user_id=user.id,
        action="token_create",
        target_type="api_token",
        target_id=str(result["id"]),
        detail={"name": body.name},
    )

    return result


@router.get("/tokens")
async def list_tokens(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tokens = await token_service.list_tokens(db, user.id)
    return tokens


@router.post("/tokens/{token_id}/rotate")
async def rotate_token(
    token_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        result = await token_service.rotate_token(db, token_id, user.id)
    except ValueError as e:
        raise HTTPException(404, str(e))

    await log_action(
        db,
        user_id=user.id,
        action="token_rotate",
        target_type="api_token",
        target_id=str(token_id),
    )

    return result


@router.delete("/tokens/{token_id}")
async def revoke_token(
    token_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await token_service.revoke_token(db, token_id, user.id)
    except ValueError as e:
        raise HTTPException(404, str(e))

    await log_action(
        db,
        user_id=user.id,
        action="token_revoke",
        target_type="api_token",
        target_id=str(token_id),
    )

    return {"message": "revoked"}


@router.delete("/tokens/{token_id}/hard")
async def hard_delete_token(
    token_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await token_service.delete_token(db, token_id, user.id)
    except ValueError as e:
        raise HTTPException(404, str(e))

    await log_action(
        db,
        user_id=user.id,
        action="token_delete",
        target_type="api_token",
        target_id=str(token_id),
    )

    return {"message": "deleted"}
