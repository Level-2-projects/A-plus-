"""Declarative SQLAlchemy base."""
from sqlalchemy.orm import DeclarativeBase
class Base(DeclarativeBase):
    """Base class used by every portable SQLAlchemy model."""
    pass
