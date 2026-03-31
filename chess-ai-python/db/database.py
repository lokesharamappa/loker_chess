"""
Async SQLAlchemy database engine — SQLite for development, PostgreSQL for production.
"""
from __future__ import annotations
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
import os

DB_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./chess_pro.db")

engine = create_async_engine(
    DB_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in DB_URL else {},
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
