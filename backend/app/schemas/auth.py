"""Pydantic v2 authentication request and response schemas."""
from pydantic import BaseModel, Field
class LoginRequest(BaseModel):
    """Login credentials accepted by the public endpoint."""
    identifier: str = Field(min_length=1)
    password: str = Field(min_length=1)
class UserResponse(BaseModel):
    """Safe authenticated-user payload matching the API contract."""
    id: str; full_name: str; role: str; department: str | None
class TokenResponse(BaseModel):
    """Bearer-token response matching the front-end client shape."""
    access_token: str; token_type: str = "bearer"; user: UserResponse
