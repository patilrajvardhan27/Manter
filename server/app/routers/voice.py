"""Voice matchmaker API.

The browser does speech-to-text and text-to-speech; these routes only move
text. The server owns the transcript (service-role writes), so the agent always
sees an authoritative history and the client can't rewrite earlier turns.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.auth import authed_user_id
from app.config import get_settings
from app.services import interviewer
from app.services.supabase_client import get_client

router = APIRouter(prefix="/voice", tags=["voice"])


class TurnRequest(BaseModel):
    session_id: str | None = None
    text: str | None = Field(default=None, max_length=5000)


class FinishRequest(BaseModel):
    session_id: str


def _own_session(sb, session_id: str, caller_id: str) -> dict:
    rows = (
        sb.table("voice_sessions")
        .select("id, profile_id, status, turn_count")
        .eq("id", session_id)
        .limit(1)
        .execute()
    ).data
    if not rows or rows[0]["profile_id"] != caller_id:
        raise HTTPException(status_code=404, detail="Interview not found")
    return rows[0]


def _turns(sb, session_id: str) -> list[dict]:
    return (
        sb.table("voice_turns")
        .select("idx, role, text")
        .eq("session_id", session_id)
        .order("idx")
        .execute()
    ).data


def _display_name(sb, profile_id: str) -> str:
    rows = sb.table("profiles").select("display_name").eq("id", profile_id).limit(1).execute().data
    return rows[0]["display_name"] if rows else ""


@router.post("/turn")
def turn(req: TurnRequest, authorization: str | None = Header(default=None)) -> dict:
    """Start an interview (no session_id) or answer the last question."""
    caller_id = authed_user_id(authorization)
    settings = get_settings()
    sb = get_client()
    max_turns = settings.voice_max_turns

    if req.session_id is None:
        since = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        recent = (
            sb.table("voice_sessions")
            .select("id", count="exact")
            .eq("profile_id", caller_id)
            .gte("created_at", since)
            .execute()
        ).count or 0
        if recent >= settings.voice_max_sessions_per_day:
            raise HTTPException(status_code=429, detail="Interview limit reached for today. Try again tomorrow.")

        session = sb.table("voice_sessions").insert({"profile_id": caller_id, "turn_count": 1}).execute().data[0]
        say = interviewer.opening_line(_display_name(sb, caller_id))
        sb.table("voice_turns").insert(
            {"session_id": session["id"], "idx": 0, "role": "agent", "text": say, "target": "warm_up"}
        ).execute()
        return {"session_id": session["id"], "say": say, "done": False, "turn": 1, "max_turns": max_turns}

    session = _own_session(sb, req.session_id, caller_id)
    if session["status"] != "active":
        raise HTTPException(status_code=409, detail="This interview is already finished")

    text = (req.text or "").strip()[: settings.voice_max_chars_per_turn]
    if not text:
        raise HTTPException(status_code=422, detail="Say or type an answer first")

    history = _turns(sb, req.session_id)
    next_idx = (history[-1]["idx"] + 1) if history else 0
    sb.table("voice_turns").insert(
        {"session_id": req.session_id, "idx": next_idx, "role": "user", "text": text}
    ).execute()
    history.append({"idx": next_idx, "role": "user", "text": text})

    agent_turns = sum(1 for t in history if t["role"] == "agent")
    target = interviewer.target_for_turn(agent_turns + 1, max_turns)
    try:
        out = interviewer.next_turn(_display_name(sb, caller_id), history, target)
    except Exception as exc:  # noqa: BLE001  surface as retryable, keep the user's answer
        raise HTTPException(status_code=502, detail="The matchmaker didn't respond. Try again.") from exc

    done = out["done"] or agent_turns + 1 >= max_turns
    sb.table("voice_turns").insert(
        {"session_id": req.session_id, "idx": next_idx + 1, "role": "agent", "text": out["say"], "target": target}
    ).execute()
    sb.table("voice_sessions").update({"turn_count": agent_turns + 1}).eq("id", req.session_id).execute()
    return {
        "session_id": req.session_id,
        "say": out["say"],
        "done": done,
        "turn": agent_turns + 1,
        "max_turns": max_turns,
    }


@router.post("/finish")
def finish(req: FinishRequest, authorization: str | None = Header(default=None)) -> dict:
    """Extract insights from the transcript and replace the caller's voice scores."""
    caller_id = authed_user_id(authorization)
    sb = get_client()
    session = _own_session(sb, req.session_id, caller_id)
    turns = _turns(sb, req.session_id)
    if sum(1 for t in turns if t["role"] == "user") < 2:
        raise HTTPException(status_code=422, detail="Answer at least two questions before finishing")

    try:
        insights = interviewer.extract(turns)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="Couldn't process the interview. Try again.") from exc

    # Latest interview wins: replace, don't accumulate, so a retake can correct a bad one.
    sb.table("voice_trait_scores").delete().eq("profile_id", caller_id).execute()
    if insights["traits"]:
        sb.table("voice_trait_scores").insert(
            [
                {
                    "profile_id": caller_id,
                    "quality_key": t["quality_key"],
                    "score": t["score"],
                    "confidence": t["confidence"],
                }
                for t in insights["traits"]
            ]
        ).execute()
    sb.table("voice_profiles").upsert(
        {
            "profile_id": caller_id,
            "session_id": session["id"],
            "summary": insights["summary"],
            "evidence": {t["quality_key"]: t["evidence"] for t in insights["traits"]},
            "partner_priorities": insights["partner_priorities"],
            "dealbreakers": insights["dealbreakers"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="profile_id",
    ).execute()
    sb.table("voice_sessions").update(
        {"status": "finished", "finished_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", req.session_id).execute()

    return insights
