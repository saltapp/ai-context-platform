from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.bridge.gitnexus_bridge import bridge
from app.core.app_service import AppService
from app.core.auth_service import User, get_current_user

router = APIRouter(tags=["graph"])


class SearchRequest(BaseModel):
    query: str
    mode: str = "hybrid"
    limit: int = 20


def _check_index(app):
    if app.index_status == "none":
        raise HTTPException(400, "App has not been indexed yet")
    if app.index_status == "indexing":
        raise HTTPException(503, "Indexing in progress, please try again later")
    if app.index_status == "failed":
        raise HTTPException(503, "Index is stale or failed, please re-index")


@router.post("/apps/{app_id}/search")
async def search_code(
    app_id: str, body: SearchRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    app = await AppService.get_app(db, app_id)
    if not app:
        raise HTTPException(404, "App not found")
    _check_index(app)

    try:
        data = await bridge.search(body.query, repo=app.name, mode=body.mode, limit=body.limit)
    except Exception as e:
        raise HTTPException(502, f"Search failed: {e}")
    return data


@router.get("/apps/{app_id}/wiki")
async def get_wiki_index(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    app = await AppService.get_app(db, app_id)
    if not app:
        raise HTTPException(404, "App not found")
    _check_index(app)

    if not app.repo_path:
        raise HTTPException(404, "App repo path not set")

    modules = bridge.read_wiki_index(app.repo_path)
    return {"modules": modules}


@router.get("/apps/{app_id}/wiki/{module}")
async def get_wiki_content(
    app_id: str, module: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    app = await AppService.get_app(db, app_id)
    if not app:
        raise HTTPException(404, "App not found")
    _check_index(app)

    if not app.repo_path:
        raise HTTPException(404, "App repo path not set")

    content = bridge.read_wiki_content(app.repo_path, module)
    if content is None:
        raise HTTPException(404, f"Wiki module '{module}' not found")
    return {"name": module, "content": content}


@router.get("/apps/{app_id}/wiki-page")
async def get_wiki_page(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    app = await AppService.get_app(db, app_id)
    if not app:
        raise HTTPException(404, "App not found")
    _check_index(app)

    if not app.repo_path:
        raise HTTPException(404, "App repo path not set")

    html = bridge.read_wiki_html(app.repo_path)
    if html is None:
        raise HTTPException(404, "Wiki page not found")
    return HTMLResponse(content=html)
