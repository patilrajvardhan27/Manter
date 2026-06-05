"""Claude Haiku red-flag scanner.

Classifies a chat message against the 7 behavioral categories from points.txt
(28–34). Returns structured flags with severity + a short rationale. Uses tool
(structured output) so we always get parseable JSON, and Haiku for low cost.
"""

import json

from anthropic import Anthropic

from app.config import get_settings

CATEGORIES = [
    "controlling_language",
    "anger_escalation",
    "guilt_tripping",
    "rushing_intimacy",
    "dismissiveness",
    "jealousy_possessiveness",
    "social_misogyny",
]

SYSTEM = (
    "You analyze a single chat message a man sent a woman on a dating app, "
    "looking ONLY for manipulation or safety red flags. Be precise, not alarmist: "
    "do not flag ordinary affection, humor, or disagreement. Only flag clear signals. "
    f"Valid categories: {', '.join(CATEGORIES)}. Severity is low, medium, or high. "
    "Rationale is one short sentence a woman would find helpful."
)

FLAG_TOOL = {
    "name": "report_flags",
    "description": "Report any red flags found in the message.",
    "input_schema": {
        "type": "object",
        "properties": {
            "flags": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "category": {"type": "string", "enum": CATEGORIES},
                        "severity": {"type": "string", "enum": ["low", "medium", "high"]},
                        "rationale": {"type": "string"},
                    },
                    "required": ["category", "severity", "rationale"],
                },
            }
        },
        "required": ["flags"],
    },
}

_client: Anthropic | None = None


def _get_client() -> Anthropic:
    global _client
    if _client is None:
        _client = Anthropic(api_key=get_settings().anthropic_api_key)
    return _client


def scan(text: str) -> dict:
    settings = get_settings()
    resp = _get_client().messages.create(
        model=settings.anthropic_model,
        max_tokens=512,
        system=SYSTEM,
        tools=[FLAG_TOOL],
        tool_choice={"type": "tool", "name": "report_flags"},
        messages=[{"role": "user", "content": f"Message to analyze:\n\n{text}"}],
    )

    flags: list[dict] = []
    for block in resp.content:
        if block.type == "tool_use" and block.name == "report_flags":
            payload = block.input
            if isinstance(payload, str):
                payload = json.loads(payload)
            flags = payload.get("flags", [])

    # keep only valid categories, in case of model drift
    flags = [f for f in flags if f.get("category") in CATEGORIES]
    return {"flagged": len(flags) > 0, "flags": flags}
