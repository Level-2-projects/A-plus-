"""JWT authentication, role protection, and scope helper skeletons."""
from collections.abc import Callable
import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.core.errors import api_error
from app.core.settings import settings
from app.db.session import get_db
from app.models.models import User
bearer = HTTPBearer(auto_error=False)
def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    """Decodes a valid JWT and resolves its active database account."""
    if credentials is None: raise api_error(401, "Authentication required.")
    try: claims = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError: raise api_error(401, "Invalid or expired token.")
    user = db.get(User, claims.get("sub"))
    if user is None or user.disabled: raise api_error(401, "Invalid or expired token.")
    return user
def require_role(*roles: str) -> Callable[[User], User]:
    """Builds a dependency that rejects authenticated users outside allowed roles."""
    def dependency(user: User = Depends(get_current_user)) -> User:
        """Checks the current user's role against the requested endpoint roles."""
        if user.role not in roles: raise api_error(403, "Forbidden: insufficient permissions.")
        return user
    return dependency
def same_department(user: User, department_id: str | None) -> bool:
    """Provides a reusable department-scope predicate for later routers."""
    return user.role == "super_admin" or user.department_id == department_id
