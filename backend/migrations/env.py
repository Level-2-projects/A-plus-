"""Alembic metadata configuration for portable A Plus migrations."""
from app.db.base import Base
from app.models import models
target_metadata = Base.metadata
