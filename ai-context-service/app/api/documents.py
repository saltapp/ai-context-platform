from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.auth_service import User, can_modify, get_current_user
from app.core.document_service import DocumentService
from app.core.system_service import SystemService

router = APIRouter(tags=["documents"])


async def _check_write_permission(system_id: str, user: User, db):
    system = await SystemService.get_system(db, system_id)
    if not system:
        raise HTTPException(404, "System not found")
    if not can_modify(user, system.created_by):
        raise HTTPException(403, "No permission to manage documents in this system")
    return system


@router.post("/systems/{system_id}/documents", status_code=201)
async def upload_system_doc(
    system_id: str,
    doc_type: str = Form("other"),
    title: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    system = await _check_write_permission(system_id, user, db)
    content = await file.read()
    doc = await DocumentService.upload(
        db, system_id=system_id, app_id=None,
        doc_type=doc_type, title=title,
        file_name=file.filename or "untitled",
        file_content=content, created_by=user.id,
    )
    if not doc:
        raise HTTPException(500, "Upload failed")
    return doc


@router.post("/apps/{app_id}/documents", status_code=201)
async def upload_app_doc(
    app_id: str,
    doc_type: str = Form("other"),
    title: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.core.app_service import AppService
    app = await AppService.get_app(db, app_id)
    if not app:
        raise HTTPException(404, "App not found")
    await _check_write_permission(app.system_id, user, db)

    content = await file.read()
    doc = await DocumentService.upload(
        db, system_id=app.system_id, app_id=app_id,
        doc_type=doc_type, title=title,
        file_name=file.filename or "untitled",
        file_content=content, created_by=user.id,
    )
    if not doc:
        raise HTTPException(500, "Upload failed")
    return doc


@router.get("/systems/{system_id}/documents")
async def list_system_docs(
    system_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    docs = await DocumentService.list_by_system(db, system_id)
    return docs


@router.get("/apps/{app_id}/documents")
async def list_app_docs(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    docs = await DocumentService.list_by_app(db, app_id)
    return docs


@router.get("/documents/{doc_id}/download")
async def download_doc(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    url = await DocumentService.download(db, doc_id)
    if not url:
        raise HTTPException(404, "Document not found")
    return {"url": url}


@router.delete("/documents/{doc_id}")
async def delete_doc(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = await DocumentService.get(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    if not can_modify(user, doc.created_by):
        raise HTTPException(403, "No permission to delete this document")
    if not await DocumentService.delete(db, doc_id):
        raise HTTPException(404, "Document not found")
    return {"message": "deleted"}
