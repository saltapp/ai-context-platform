"""Create a user from command line. Usage: python create_user.py <username> <password> [--admin]"""
import sys
import asyncio

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.config import settings
from app.core.auth_service import hash_password
from app.models.user import User


async def main():
    if len(sys.argv) < 3:
        print("Usage: python create_user.py <username> <password> [--admin]")
        sys.exit(1)

    username = sys.argv[1]
    password = sys.argv[2]
    role = "admin" if "--admin" in sys.argv else "user"

    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine)

    async with async_session() as db:
        user = User(
            username=username,
            password_hash=hash_password(password),
            display_name=username,
            role=role,
        )
        db.add(user)
        await db.commit()
        print(f"User '{username}' created with role '{role}'")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
