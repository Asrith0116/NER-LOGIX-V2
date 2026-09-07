"""
Database engine and session setup for future PostgreSQL/PostGIS.
Designed with graceful fallback: if no DATABASE_URL is configured, the system operates in foundation mode.
"""

from typing import Generator, Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

engine = None
SessionLocal = None

if settings.DATABASE_URL:
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker

        engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=settings.DATABASE_POOL_SIZE,
            max_overflow=settings.DATABASE_MAX_OVERFLOW,
            echo=settings.DATABASE_ECHO,
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        logger.info("PostgreSQL/PostGIS engine initialized successfully.")
    except Exception as exc:
        logger.warning(f"Could not initialize database engine from DATABASE_URL: {exc}. Running in foundation mode.")
        engine = None
        SessionLocal = None
else:
    logger.info("No DATABASE_URL configured. Running database layer in foundation/unconnected mode.")


def get_db() -> Generator[Optional[object], None, None]:
    """
    FastAPI dependency yielding a database session if available,
    or None if running in foundation/offline mode.
    """
    if SessionLocal is None:
        yield None
        return

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def is_database_connected() -> bool:
    """Check whether a live relational/spatial database connection is active."""
    if engine is None:
        return False
    try:
        with engine.connect() as conn:
            return True
    except Exception:
        return False
