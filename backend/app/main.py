"""FastAPI application composition and middleware registration."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.settings import settings
from app.routers import auth, dev
def create_app() -> FastAPI:
    """Creates the server with contract-compatible routers and CORS origins."""
    app=FastAPI(title="A Plus API")
    app.add_middleware(CORSMiddleware,allow_origins=list(settings.cors_origins),allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
    app.include_router(auth.router)
    if settings.app_env in {"dev","test"}: app.include_router(dev.router)
    return app
app=create_app()
