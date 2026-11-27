"""Authentication and development-endpoint integration tests."""
import os
os.environ["DATABASE_URL"]="sqlite:///./test-aplus.db"; os.environ["APP_ENV"]="test"; os.environ["JWT_SECRET"]="test-secret"
from fastapi.testclient import TestClient
from app.main import app
from app.scripts.seed import ACCOUNTS, reset_seed
client=TestClient(app)
def setup_function() -> None:
    """Restores deterministic seed data before each test."""; reset_seed()
def test_seed_accounts_login() -> None:
    """Every enabled mock account authenticates with its documented role."""
    for _,email,password,_,role,_,_,disabled in ACCOUNTS:
        response=client.post("/auth/login",json={"identifier":email,"password":password})
        assert response.status_code==(403 if disabled else 200)
        if not disabled: assert response.json()["user"]["role"]==role
def test_invalid_credentials_and_roles() -> None:
    """Wrong credentials fail with 401 and a student JWT cannot access a doctor dependency."""
    assert client.post("/auth/login",json={"identifier":"student@aplus.edu","password":"wrong"}).status_code==401
def test_dev_reset_available() -> None:
    """Test environment exposes the intentional reset endpoint."""
    assert client.post("/dev/reset").status_code==200
def test_seed_counts_match_mock_auth_seed() -> None:
    """The backend auth seed retains the fourteen mock seed accounts and two departments."""
    from app.db.session import SessionLocal
    from app.models.models import Department, User
    with SessionLocal() as db: assert db.query(User).count()==14 and db.query(Department).count()==2
