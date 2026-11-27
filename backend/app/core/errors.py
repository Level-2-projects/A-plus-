"""Contract-compatible FastAPI error helpers."""
from fastapi import HTTPException
def api_error(status: int, message: str, details: dict[str, str] | None = None) -> HTTPException:
    """Creates one API-contract-shaped HTTP exception."""
    return HTTPException(status_code=status, detail={"status": status, "message": message, "details": details} if details else {"message": message})
