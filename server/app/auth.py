"""Shared request auth for routes that act on behalf of a signed-in user."""

from fastapi import HTTPException

from app.services.supabase_client import get_client


def authed_user_id(authorization: str | None) -> str:
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
    except Exception as exc:  # noqa: BLE001  any GoTrue rejection is unauthorized
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user.user.id
