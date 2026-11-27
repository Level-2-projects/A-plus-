"""Password hashing and JWT helpers."""
from datetime import timedelta
import bcrypt
import jwt
from .clock import now
from .settings import settings
def hash_password(password: str) -> str:
    """Hashes one seed or user password with bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
def verify_password(password: str, password_hash: str) -> bool:
    """Safely compares a plaintext password with its bcrypt hash."""
    return bcrypt.checkpw(password.encode(), password_hash.encode())
def create_access_token(user_id: str, role: str, department_id: str | None) -> str:
    """Creates the contract-required expiring JWT claims."""
    expiry = now() + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode({"sub": user_id, "role": role, "department_id": department_id, "exp": expiry}, settings.jwt_secret, algorithm="HS256")
