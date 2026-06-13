"""Claude Haiku quiz evaluator.

Men answer behavioral scenario questions in their own words. This scores each
free-text answer against the quality (or qualities) the question measures, 1–5,
using tool/structured output so we always get parseable JSON. Haiku keeps it
cheap. The resulting per-quality scores feed man_quiz_scores exactly like the
old multiple-choice deltas did.
"""

import json

from anthropic import Anthropic

from app.config import get_settings

SYSTEM = (
    "You evaluate how a man answered behavioral scenario questions on a dating "
    "app built for women's safety and standards. For each named quality, score "
    "how strongly HIS answer demonstrates that quality on a 1–5 scale: "
    "1 = clear red flag / opposite of the quality, 3 = neutral, vague, or "
    "non-committal, 5 = a clear, specific green flag. Judge only what the answer "
    "actually shows — reward concrete, respectful, emotionally mature responses; "
    "penalize controlling, dismissive, or self-centered ones. Do not reward "
    "length or buzzwords. Score every quality_key you are given, and only those. "
    "For each score, also give a one-sentence reason addressed to the man "
    "himself (\"You...\"), pointing at the specific thing in his answer that "
    "drove the score — especially what to change for scores of 1-2, and what "
    "worked for scores of 4-5. Keep reasons under 160 characters."
)

_client: Anthropic | None = None


def _get_client() -> Anthropic:
    global _client
    if _client is None:
        _client = Anthropic(api_key=get_settings().anthropic_api_key)
    return _client


def evaluate(answers: list[dict]) -> dict[str, dict]:
    """answers: [{prompt, qualities: [{key,label}], answer}].

    Returns key -> {"score": 1–5, "reason": str}.
    """
    items = [a for a in answers if (a.get("answer") or "").strip()]
    label_by_key: dict[str, str] = {}
    for a in items:
        for q in a.get("qualities", []):
            label_by_key[q["key"]] = q["label"]

    keys = sorted(label_by_key)
    if not keys:
        return {}

    tool = {
        "name": "report_scores",
        "description": "Report a 1–5 score and a short reason for each quality the answers were evaluated against.",
        "input_schema": {
            "type": "object",
            "properties": {
                "scores": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "quality_key": {"type": "string", "enum": keys},
                            "score": {"type": "integer", "minimum": 1, "maximum": 5},
                            "reason": {"type": "string"},
                        },
                        "required": ["quality_key", "score", "reason"],
                    },
                }
            },
            "required": ["scores"],
        },
    }

    blocks = []
    for i, a in enumerate(items, 1):
        labels = ", ".join(f"{q['label']} ({q['key']})" for q in a.get("qualities", []))
        blocks.append(
            f"Q{i}: {a['prompt']}\nMeasures: {labels}\nHis answer: {a['answer'].strip()}"
        )
    user = "Score these answers.\n\n" + "\n\n".join(blocks)

    resp = _get_client().messages.create(
        model=get_settings().anthropic_model,
        max_tokens=1024,
        system=SYSTEM,
        tools=[tool],
        tool_choice={"type": "tool", "name": "report_scores"},
        messages=[{"role": "user", "content": user}],
    )

    raw: list[dict] = []
    for block in resp.content:
        if block.type == "tool_use" and block.name == "report_scores":
            payload = block.input
            if isinstance(payload, str):
                payload = json.loads(payload)
            raw = payload.get("scores", [])

    # Average scores across questions that touched the same quality, clamped to
    # [1,5]; keep the reason from the lowest-scoring question — that's the one
    # most worth surfacing to the man.
    agg: dict[str, list[float]] = {}
    reasons: dict[str, tuple[float, str]] = {}
    for s in raw:
        k = s.get("quality_key")
        if k not in label_by_key:
            continue
        score = max(1.0, min(5.0, float(s["score"])))
        agg.setdefault(k, []).append(score)
        reason = (s.get("reason") or "").strip()
        if reason and (k not in reasons or score < reasons[k][0]):
            reasons[k] = (score, reason)

    return {
        k: {"score": round(sum(v) / len(v), 2), "reason": reasons.get(k, (0, ""))[1]}
        for k, v in agg.items()
    }
