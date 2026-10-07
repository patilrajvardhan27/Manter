from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import ai, matchmaker

settings = get_settings()

app = FastAPI(
    title="Charms Service",
    description="Red-flag scanning and introduction rounds for Charms.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(ai.router)
app.include_router(matchmaker.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": settings.anthropic_model}
