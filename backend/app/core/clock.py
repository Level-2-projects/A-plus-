"""Single testable time boundary for backend business rules."""
from datetime import datetime, timezone
_fake_now: datetime | None = None
def now() -> datetime:
    """Returns fake UTC time when set, otherwise the current UTC instant."""
    return _fake_now or datetime.now(timezone.utc)
def set_clock(value: datetime | None) -> None:
    """Sets or clears the process-local fake UTC clock for dev/test endpoints."""
    global _fake_now
    _fake_now = value
