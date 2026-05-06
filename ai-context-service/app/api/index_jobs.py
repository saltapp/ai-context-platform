from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.auth_service import User, can_modify, get_current_user
from app.core.app_service import AppService
from app.core.index_scheduler import IndexScheduler

router = APIRouter(tags=["index"])


class IndexTrigger(BaseModel):
    include_wiki: bool = True
    force: bool = False


@router.post("/apps/{app_id}/index", status_code=202)
async def trigger_index(
    app_id: str,
    body: IndexTrigger = IndexTrigger(),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app = await AppService.get_app(db, app_id)
    if not app:
        raise HTTPException(404, "App not found")
    if not can_modify(user, app.created_by):
        raise HTTPException(403, "No permission to trigger index for this app")
    try:
        job = await IndexScheduler.trigger_index(
            db, app_id, include_wiki=body.include_wiki, force=body.force
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"job_id": job.id, "status": job.status}


@router.post("/apps/{app_id}/index/cancel")
async def cancel_index(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app = await AppService.get_app(db, app_id)
    if not app:
        raise HTTPException(404, "App not found")
    if not can_modify(user, app.created_by):
        raise HTTPException(403, "No permission to cancel index for this app")
    cancelled = await IndexScheduler.cancel_index(db, app_id)
    if not cancelled:
        raise HTTPException(400, "No active index job to cancel")
    return {"message": "cancelled"}


@router.get("/apps/{app_id}/index/status")
async def get_index_status(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    status = await IndexScheduler.get_app_index_status(db, app_id)
    if not status:
        raise HTTPException(404, "App not found")
    return status


@router.get("/index/jobs/{job_id}")
async def get_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    job = await IndexScheduler.get_job_status(db, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.get("/index/jobs/{job_id}/progress")
async def job_progress(
    job_id: int,
    _: User = Depends(get_current_user),
):
    return StreamingResponse(
        IndexScheduler.stream_progress(job_id),
        media_type="text/event-stream",
    )
