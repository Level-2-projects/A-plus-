"""Public contract-compatible authentication router."""
from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from app.core.errors import api_error
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.models import Department, User
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
router = APIRouter(tags=["auth"])
@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticates an active email or university-id account and returns a JWT."""
    user = db.scalar(select(User).where(or_(User.email.ilike(payload.identifier), User.university_id == payload.identifier)))
    if user is None or not verify_password(payload.password, user.password_hash): raise api_error(401, "Invalid credentials.")
    if user.disabled: raise api_error(403, "Account disabled.")
    department = db.get(Department, user.department_id) if user.department_id else None
    return TokenResponse(access_token=create_access_token(user.id, user.role, user.department_id), user=UserResponse(id=user.id, full_name=user.full_name, role=user.role, department=department.name if department else None))
