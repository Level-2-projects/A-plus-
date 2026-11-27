"""Development-only database reset and fake-clock endpoints."""
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.core.clock import set_clock
from app.core.settings import settings
router=APIRouter(prefix="/dev",tags=["dev"])
def guard() -> None:
    """Hides mutable development endpoints outside dev and test environments."""
    if settings.app_env not in {"dev","test"}: raise HTTPException(status_code=404,detail={"message":"Not found."})
@router.post("/reset")
def reset() -> dict[str,str]:
    """Reloads deterministic database seed data in development only."""
    guard(); from app.scripts.seed import reset_seed; reset_seed(); return {"message":"Seed reset."}
@router.post("/clock")
def clock(value: datetime | None = None) -> dict[str,str]:
    """Sets or clears the process-local fake clock in development only."""
    guard(); set_clock(value); return {"message":"Clock updated."}
