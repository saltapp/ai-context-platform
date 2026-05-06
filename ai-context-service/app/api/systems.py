from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.auth_service import User, can_modify, get_current_user
from app.core.system_service import SystemService

router = APIRouter(tags=["systems"])


class SystemCreate(BaseModel):
    name: str
    group_name: str | None = None
    description: str | None = None
    owner: str | None = None
    gitlab_username: str | None = None
    gitlab_token: str | None = None


class SystemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    owner: str | None = None


class GitlabCredentialsUpdate(BaseModel):
    gitlab_username: str
    gitlab_token: str


class RelationCreate(BaseModel):
    target_system_id: str
    relation_type: str
    description: str | None = None


class DeleteConfirm(BaseModel):
    confirm_name: str


@router.post("/systems", status_code=201)
async def create_system(
    body: SystemCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    system = await SystemService.create_system(
        db, name=body.name, group_name=body.group_name,
        description=body.description, owner=body.owner,
        gitlab_username=body.gitlab_username, gitlab_token=body.gitlab_token,
        created_by=user.id,
    )
    return system


@router.get("/systems")
async def list_systems(
    skip: int = 0, limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    systems = await SystemService.list_systems(db, skip, limit)
    return systems


@router.get("/systems/{system_id}")
async def get_system(
    system_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    system = await SystemService.get_system(db, system_id)
    if not system:
        raise HTTPException(404, "System not found")
    return system


@router.put("/systems/{system_id}")
async def update_system(
    system_id: str, body: SystemUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    system = await SystemService.get_system(db, system_id)
    if not system:
        raise HTTPException(404, "System not found")
    if not can_modify(user, system.created_by):
        raise HTTPException(403, "No permission to modify this system")
    system = await SystemService.update_system(db, system_id, **body.model_dump(exclude_none=True))
    return system


@router.put("/systems/{system_id}/gitlab-credentials")
async def update_gitlab_credentials(
    system_id: str, body: GitlabCredentialsUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    system = await SystemService.get_system(db, system_id)
    if not system:
        raise HTTPException(404, "System not found")
    if not can_modify(user, system.created_by):
        raise HTTPException(403, "No permission to modify this system")
    system = await SystemService.update_gitlab_credentials(
        db, system_id, body.gitlab_username, body.gitlab_token
    )
    return system


@router.delete("/systems/{system_id}")
async def delete_system(
    system_id: str,
    body: DeleteConfirm,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    system = await SystemService.get_system(db, system_id)
    if not system:
        raise HTTPException(404, "System not found")
    if not can_modify(user, system.created_by):
        raise HTTPException(403, "No permission to delete this system")
    if body.confirm_name != system.name:
        raise HTTPException(400, "confirm_name does not match system name")
    if not await SystemService.delete_system(db, system_id):
        raise HTTPException(404, "System not found")
    return {"message": "deleted"}


@router.post("/systems/{system_id}/relations", status_code=201)
async def add_relation(
    system_id: str, body: RelationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    system = await SystemService.get_system(db, system_id)
    if not system:
        raise HTTPException(404, "System not found")
    if not can_modify(user, system.created_by):
        raise HTTPException(403, "No permission to modify this system")
    rel = await SystemService.add_relation(
        db, source_system_id=system_id, target_system_id=body.target_system_id,
        relation_type=body.relation_type, description=body.description,
    )
    return rel


@router.get("/systems/{system_id}/relations")
async def list_relations(
    system_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    relations = await SystemService.list_relations(db, system_id)
    return relations


@router.delete("/systems/{system_id}/relations/{target_id}")
async def remove_relation(
    system_id: str, target_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    system = await SystemService.get_system(db, system_id)
    if not system:
        raise HTTPException(404, "System not found")
    if not can_modify(user, system.created_by):
        raise HTTPException(403, "No permission to modify this system")
    if not await SystemService.remove_relation(db, system_id, target_id):
        raise HTTPException(404, "Relation not found")
    return {"message": "removed"}
