from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.auth import authed_user_id
from app.services.redflags import scan
from app.services.supabase_client import get_client

router = APIRouter(tags=["ai"])


class ScanRequest(BaseModel):
    message_id: str


@router.post("/scan")
def scan_message(req: ScanRequest, authorization: str | None = Header(default=None)) -> dict:
    """Scan a message for red flags. Only a participant in the message's
    match may trigger this, and only for messages sent by the other person
    (mirrors the `red_flags: recipient reads` RLS policy). Idempotent per
    message: once scanned, later calls return the stored result instead of
    re-billing the model API.
    """
    caller_id = authed_user_id(authorization)
    sb = get_client()

    msgs = (
        sb.table("messages")
        .select("id, match_id, sender_id, body, scanned")
        .eq("id", req.message_id)
        .limit(1)
        .execute()
    ).data
    if not msgs:
        raise HTTPException(status_code=404, detail="Message not found")
    msg = msgs[0]

    matches = (
        sb.table("matches")
        .select("seeker_id, target_id")
        .eq("id", msg["match_id"])
        .limit(1)
        .execute()
    ).data
    match = matches[0] if matches else None
    if match is None or caller_id not in (match["seeker_id"], match["target_id"]):
        raise HTTPException(status_code=403, detail="Not a participant in this match")
    if caller_id == msg["sender_id"]:
        raise HTTPException(status_code=403, detail="Cannot scan your own message")

    if msg["scanned"]:
        existing = (
            sb.table("red_flags")
            .select("category, severity, rationale")
            .eq("message_id", req.message_id)
            .execute()
        ).data
        return {"message_id": req.message_id, "flagged": len(existing) > 0, "flags": existing}

    result = scan(msg["body"])
    if result["flags"]:
        sb.table("red_flags").insert(
            [{"message_id": req.message_id, **f} for f in result["flags"]]
        ).execute()
    sb.table("messages").update({"scanned": True}).eq("id", req.message_id).execute()

    return {"message_id": req.message_id, **result}
