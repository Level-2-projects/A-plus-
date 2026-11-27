"""Database engine and request-session dependency."""
from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from app.core.settings import settings
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
def get_db() -> Generator[Session, None, None]:
    """Yields one database session and always closes it."""
    db = SessionLocal()
    try: yield db
    finally: db.close()
