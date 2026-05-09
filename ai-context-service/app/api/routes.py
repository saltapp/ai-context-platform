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
        processes = await bridge.get_processes(app.name)

        # Deduplicate by handler entry point
        routes = []
        seen = set()
        for proc in processes:
            key = f"{proc['handler_file']}:{proc['handler']}"
            if not proc["handler"] or key in seen:
                continue
            seen.add(key)
            routes.append({
                "method": "",
                "path": "",
                "handler": proc["handler"],
                "handler_file": proc["handler_file"],
                "process_summary": proc["summary"],
                "process_type": proc["process_type"],
                "middleware": [],
                "consumers": [],
            })

        return {"routes": routes}
    except Exception as e:
        raise HTTPException(502, f"Failed to query GitNexus: {e}")
