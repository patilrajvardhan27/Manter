"""Red-flag scanner.

Classifies a chat message against the 7 behavioral categories from points.txt
(28–34). Returns structured flags with severity + a short rationale. Uses tool
(structured output) so we always get parseable JSON, and Haiku for low cost.
"""

from app.services.llm import call_tool

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
    "You analyze a single chat message one person sent another on a dating app, "
    "looking ONLY for manipulation or safety red flags. Be precise, not alarmist: "
    "do not flag ordinary affection, humor, or disagreement. Only flag clear signals. "
    f"Valid categories: {', '.join(CATEGORIES)}. Severity is low, medium, or high. "
    "Rationale is one short sentence the recipient would find helpful."
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


def scan(text: str) -> dict:
    payload = call_tool(
        system=SYSTEM,
        tool=FLAG_TOOL,
        messages=[{"role": "user", "content": f"Message to analyze:\n\n{text}"}],
    )
    flags = payload.get("flags", [])
    # keep only valid categories, in case of model drift
    flags = [f for f in flags if isinstance(f, dict) and f.get("category") in CATEGORIES]
    return {"flagged": len(flags) > 0, "flags": flags}
