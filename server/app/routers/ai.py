from fastapi import APIRouter
from pydantic import BaseModel

from app.services.redflags import scan

router = APIRouter(tags=["ai"])


class ScanRequest(BaseModel):
    message_id: str
    text: str


@router.post("/scan")
def scan_message(req: ScanRequest) -> dict:
    result = scan(req.text)
    # NOTE: persistence of flags to Supabase (service-role) happens here in
    # Phase 6 so the client can't forge flags. Returned for immediate UI use.
    return {"message_id": req.message_id, **result}
