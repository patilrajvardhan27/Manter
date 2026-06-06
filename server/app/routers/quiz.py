from fastapi import APIRouter
from pydantic import BaseModel

from app.services.quiz_eval import evaluate

router = APIRouter(tags=["quiz"])


class QualityRef(BaseModel):
    key: str
    label: str


class QAItem(BaseModel):
    prompt: str
    qualities: list[QualityRef] = []
    answer: str


class EvaluateRequest(BaseModel):
    answers: list[QAItem]


@router.post("/evaluate")
def evaluate_quiz(req: EvaluateRequest) -> dict:
    payload = [
        {"prompt": a.prompt, "answer": a.answer, "qualities": [q.model_dump() for q in a.qualities]}
        for a in req.answers
    ]
    return {"scores": evaluate(payload)}
