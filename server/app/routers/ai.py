from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.services.redflags import scan
from app.services.supabase_client import get_client

router = APIRouter(tags=["ai"])


class ScanRequest(BaseModel):
    message_id: str


def _authed_user_id(authorization: str | None) -> str:
    """Validate the caller's Supabase access token and return their user id.

    Delegates verification to GoTrue itself (via the shared service-role
    client) rather than decoding the JWT locally, so this keeps working
    whether the project signs tokens with a shared secret or asymmetric keys.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        user = get_client().auth.get_user(token)
    except Exception as exc:  # noqa: BLE001 — any GoTrue rejection is unauthorized
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user.user.id


@router.post("/scan")
def scan_message(req: ScanRequest, authorization: str | None = Header(default=None)) -> dict:
    """Scan a message for red flags. Only a participant in the message's
    match may trigger this, and only for messages sent by the other person
    (mirrors the `red_flags: recipient reads` RLS policy). Idempotent per
    message: once scanned, later calls return the stored result instead of
    re-billing Anthropic.
    """
    caller_id = _authed_user_id(authorization)
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
