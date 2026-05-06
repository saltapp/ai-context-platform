from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.bridge.gitnexus_bridge import bridge
from app.core.app_service import AppService
from app.core.auth_service import User, get_current_user

router = APIRouter(tags=["routes"])


@router.get("/apps/{app_id}/routes")
async def get_routes(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    app = await AppService.get_app(db, app_id)
    if not app:
        raise HTTPException(404, "App not found")
    if app.index_status == "none":
        raise HTTPException(400, "App has not been indexed yet")
    if app.index_status == "indexing":
        raise HTTPException(503, "Indexing in progress, please try again later")

    try:
        data = await bridge.search("", repo=app.name, limit=0)
    except Exception:
        pass

    try:
        repos = await bridge.get_repos()
        repo_name = None
        for r in repos:
            if r.get("path", "").endswith(app.name) or r.get("name") == app.name:
                repo_name = r.get("name")
                break

        if not repo_name:
            return {"routes": []}

        resp = await bridge._client.get("/api/processes", params={"repo": repo_name})
        resp.raise_for_status()
        processes = resp.json()

        routes = []
        seen = set()
        for proc in processes:
            proc_name = proc.get("name", "")
            steps = proc.get("steps", [])
            for step in steps:
                for node in step.get("nodes", []):
                    node_type = node.get("type", "")
                    if node_type == "Route" and node_type not in seen:
                        seen.add(node_type)
                        routes.append({
                            "method": node.get("method", ""),
                            "path": node.get("path", ""),
                            "handler": node.get("name", ""),
                            "handler_file": node.get("filePath", ""),
                            "middleware": [],
                            "consumers": [],
                        })

        return {"routes": routes}
    except Exception as e:
        raise HTTPException(502, f"Failed to query GitNexus: {e}")
