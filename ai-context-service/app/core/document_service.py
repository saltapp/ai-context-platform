import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_s3_client
from app.config import settings
from app.models.base import gen_id
from app.models.document import Document

logger = logging.getLogger("ai-context-service.document")


class DocumentService:
    @staticmethod
    def _s3_key(system_id: str, app_id: str | None, doc_id: str, filename: str) -> str:
        app_part = app_id or "_system"
        return f"{system_id}/{app_part}/docs/{doc_id}/{filename}"

    @staticmethod
    async def upload(
        db: AsyncSession,
        system_id: str,
        app_id: str | None,
        doc_type: str,
        title: str,
        file_name: str,
        file_content: bytes,
        created_by: int | None,
    ) -> Document | None:
        from app.models.system import System

        stmt = select(System).where(System.id == system_id, System.deleted == False)  # noqa: E712
        system = (await db.execute(stmt)).scalar_one_or_none()
        if not system:
            return None

        doc_id = gen_id()
        s3_key = DocumentService._s3_key(system_id, app_id, doc_id, file_name)

        s3 = get_s3_client()
        try:
            s3.head_bucket(Bucket=settings.S3_BUCKET)
        except Exception:
            s3.create_bucket(Bucket=settings.S3_BUCKET)

        s3.put_object(
            Bucket=settings.S3_BUCKET,
            Key=s3_key,
            Body=file_content,
        )

        doc = Document(
            id=doc_id,
            system_id=system_id,
            app_id=app_id,
            doc_type=doc_type,
            title=title,
            file_name=file_name,
            s3_key=s3_key,
            file_size=len(file_content),
            created_by=created_by,
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return doc

    @staticmethod
    async def list_by_system(db: AsyncSession, system_id: str) -> list[Document]:
        stmt = select(Document).where(
            Document.system_id == system_id, Document.deleted == False  # noqa: E712
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def list_by_app(db: AsyncSession, app_id: str) -> list[Document]:
        stmt = select(Document).where(
            Document.app_id == app_id, Document.deleted == False  # noqa: E712
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get(db: AsyncSession, doc_id: str) -> Document | None:
        stmt = select(Document).where(
            Document.id == doc_id, Document.deleted == False  # noqa: E712
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def delete(db: AsyncSession, doc_id: str) -> bool:
        doc = await DocumentService.get(db, doc_id)
        if not doc:
            return False
        doc.deleted = True
        await db.commit()
        return True

    @staticmethod
    async def download(db: AsyncSession, doc_id: str) -> str | None:
        """Return a presigned S3 URL for downloading the document."""
        doc = await DocumentService.get(db, doc_id)
        if not doc:
            return None
        s3 = get_s3_client()
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET, "Key": doc.s3_key},
            ExpiresIn=3600,
        )
        return url
