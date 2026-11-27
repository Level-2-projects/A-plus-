"""Initial portable schema migration; generated metadata is authoritative for B1."""
revision="0001_initial"; down_revision=None; branch_labels=None; depends_on=None
def upgrade() -> None:
    """Creates all initial A Plus tables."""
    from app.db.base import Base
    from app.db.session import engine
    Base.metadata.create_all(engine)
def downgrade() -> None:
    """Drops all initial A Plus tables."""
    from app.db.base import Base
    from app.db.session import engine
    Base.metadata.drop_all(engine)
