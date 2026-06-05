from fastapi import APIRouter
from pydantic import BaseModel

from app.services.scoring import QualityInput, compatibility

router = APIRouter(tags=["scoring"])


class QualityPayload(BaseModel):
    quality_key: str
    weight: int
    quiz_score: float
    community_avg: float = 0.0
    community_n: int = 0


class ScoreRequest(BaseModel):
    woman_id: str
    man_id: str
    # In production these are loaded server-side from Supabase via the service
    # role key. Accepting them in the body keeps the engine testable in isolation.
    qualities: list[QualityPayload] = []


@router.post("/score")
def score(req: ScoreRequest) -> dict:
    inputs = [
        QualityInput(
            quality_key=q.quality_key,
            weight=q.weight,
            quiz_score=q.quiz_score,
            community_avg=q.community_avg,
            community_n=q.community_n,
        )
        for q in req.qualities
    ]
    return compatibility(inputs)
