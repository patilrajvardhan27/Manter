"""Trigger an introduction round. Meant for a scheduler, not for users.

Example cron (Render, GitHub Actions, or Supabase pg_cron + pg_net):

    curl -X POST "$API/matchmaker/run" -H "X-Matchmaker-Secret: $MATCHMAKER_SECRET"
"""

import hmac

from fastapi import APIRouter, Header, HTTPException

from app.config import get_settings
from app.services.intro_job import run_round
from app.services.supabase_client import get_client

router = APIRouter(prefix="/matchmaker", tags=["matchmaker"])


@router.post("/run")
def run(dry_run: bool = False, x_matchmaker_secret: str | None = Header(default=None)) -> dict:
    secret = get_settings().matchmaker_secret
    if not secret or not x_matchmaker_secret or not hmac.compare_digest(secret, x_matchmaker_secret):
        raise HTTPException(status_code=403, detail="Forbidden")
    return run_round(get_client(), dry_run=dry_run)
