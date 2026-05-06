from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.bridge.gitnexus_bridge import bridge
from app.core.app_service import AppService
from app.core.auth_service import User, get_current_user
from app.models.app import App
from app.models.system_relation import SystemRelation

router = APIRouter(tags=["impact"])


class ImpactRequest(BaseModel):
    target: str
    direction: str = "both"
    depth: int = 3
    cross_project: bool = False
    cross_system: bool = False


def _get_repo_name(app: App) -> str | None:
    return app.name


@router.post("/apps/{app_id}/impact")
async def analyze_impact(
    app_id: str, body: ImpactRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    app = await AppService.get_app(db, app_id)
    if not app:
        raise HTTPException(404, "App not found")
    if app.index_status == "none":
        raise HTTPException(400, "App has not been indexed yet")
    if app.index_status == "indexing":
        raise HTTPException(503, "Indexing in progress")

    repo = _get_repo_name(app)

    try:
        result = await _do_impact(body.target, body.direction, body.depth, repo)
    except Exception as e:
        raise HTTPException(502, f"GitNexus query failed: {e}")

    if body.cross_system:
        stmt = select(SystemRelation).where(
            SystemRelation.source_system_id == app.system_id
        )
        rels = (await db.execute(stmt)).scalars().all()
        cross_system_impacts = []
        for rel in rels:
            stmt2 = select(App).where(App.system_id == rel.target_system_id)
            target_apps = (await db.execute(stmt2)).scalars().all()
            for ta in target_apps:
                if ta.index_status == "current":
                    try:
                        cs_result = await _do_impact(
                            body.target, body.direction, body.depth, ta.name
                        )
                        if cs_result.get("summary", {}).get("direct_upstream", 0) > 0 or \
                           cs_result.get("summary", {}).get("direct_downstream", 0) > 0:
                            cross_system_impacts.append({
                                "system_id": rel.target_system_id,
                                "app_id": ta.id,
                                "app_name": ta.name,
                                "symbols": cs_result.get("upstream", []) + cs_result.get("downstream", []),
                            })
                    except Exception:
                        pass
        result["cross_system_impacts"] = cross_system_impacts

    return result


async def _do_impact(target: str, direction: str, depth: int, repo: str | None) -> dict:
    resp = await bridge._client.post(
        f"{bridge._client.base_url}/api/query",
        json={"query": target, "limit": 5, "repo": repo},
    )
    resp.raise_for_status()
    query_data = resp.json()

    cypher = (
        f"MATCH (a)-[r]->(b) WHERE b.name CONTAINS '{target}' OR b.filePath CONTAINS '{target}' "
        f"RETURN a.name, a.filePath, type(r), b.name, b.filePath LIMIT 50"
    )
    if direction == "upstream":
        cypher = (
            f"MATCH (a)-[r]->(b) WHERE b.name CONTAINS '{target}' "
            f"RETURN a.name AS caller, a.filePath AS caller_file, b.name AS callee LIMIT 50"
        )
    elif direction == "downstream":
        cypher = (
            f"MATCH (a)-[r]->(b) WHERE a.name CONTAINS '{target}' "
            f"RETURN a.name AS caller, b.name AS callee, b.filePath AS callee_file LIMIT 50"
        )

    try:
        cypher_resp = await bridge._client.post(
            f"{bridge._client.base_url}/api/query",
            json={"cypher": cypher, "repo": repo},
        )
        cypher_resp.raise_for_status()
        cypher_data = cypher_resp.json()
    except Exception:
        cypher_data = []

    upstream = []
    downstream = []
    if isinstance(cypher_data, list):
        for row in cypher_data:
            if direction in ("upstream", "both"):
                upstream.append({"depth": 1, "nodes": [row]})
            if direction in ("downstream", "both"):
                downstream.append({"depth": 1, "nodes": [row]})

    return {
        "target": {"name": target, "type": "unknown", "file": ""},
        "risk": "UNKNOWN",
        "summary": {
            "direct_upstream": len(upstream),
            "direct_downstream": len(downstream),
            "affected_processes": len(query_data.get("processes", [])) if isinstance(query_data, dict) else 0,
        },
        "upstream": upstream,
        "downstream": downstream,
        "affected_processes": query_data.get("processes", []) if isinstance(query_data, dict) else [],
    }
