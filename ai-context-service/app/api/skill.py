import io
import zipfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse, StreamingResponse

router = APIRouter(tags=["skill"])

SKILL_TEMPLATE_PATH = Path(__file__).resolve().parent.parent.parent / "skill" / "SKILL.md"


@router.get("/skill/template")
async def get_skill_template():
    if not SKILL_TEMPLATE_PATH.exists():
        raise HTTPException(404, "Template not found")
    return PlainTextResponse(
        content=SKILL_TEMPLATE_PATH.read_text(encoding="utf-8"),
        media_type="text/markdown",
    )


@router.get("/skill/download")
async def download_skill():
    if not SKILL_TEMPLATE_PATH.exists():
        raise HTTPException(404, "Skill template not found")

    content = SKILL_TEMPLATE_PATH.read_text(encoding="utf-8")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("ai-context/SKILL.md", content)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=ai-context-skill.zip"},
    )
