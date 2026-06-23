from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import ai

settings = get_settings()

app = FastAPI(
    title="Charms Service",
    description="Claude Haiku red-flag detection for Charms.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(ai.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": settings.anthropic_model}
