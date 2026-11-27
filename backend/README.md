# A Plus backend

Python 3.11+ FastAPI/SQLAlchemy scaffold. Copy `.env.example` to `.env`, then install `pip install -r requirements.txt` in `backend/.venv`.

Run: `uvicorn app.main:app --reload --port 8000`; migrate: `alembic upgrade head`; seed: `python -m app.scripts.seed`; test: `pytest`.

Configuration is environment-only: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRE_MINUTES`, `APP_ENV`, `CORS_ORIGINS`. SQLite is the local default. For SQL Server use `mssql+pyodbc://...` with Microsoft ODBC Driver 18 installed; models avoid SQLite-specific SQL.

| Account | Password |
|---|---|
| student@aplus.edu | Student123 |
| doctor@aplus.edu | Doctor123 |
| dept@aplus.edu | Dept123 |
| dean@aplus.edu | Dean123 |
