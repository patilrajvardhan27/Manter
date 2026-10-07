"""The voice matchmaker: picks the next question, then turns the transcript
into evidence-backed character scores.

Speech-to-text and text-to-speech run in the browser. This module only sees
text, which keeps it model-agnostic and cheap (Haiku per turn).

Two design choices worth knowing:

* The server, not the model, decides what to ask about next. The quiz only
  measures 9 of 23 qualities, so `plan_targets` queues the 14 it misses, then
  partner preferences, then a wrap-up. The model only phrases the question.
  That makes coverage deterministic and testable instead of hoping the model
  remembers what it already asked.

* Extraction scores stories, not self-labels. "I'm really humble" is cheap;
  "I told my manager the bug was mine" is evidence. Confidence is capped at
  0.8 so one interview can never fully override the quiz, and the fusion in
  the `character_scores` view weights each source by its confidence.
"""

from __future__ import annotations

from typing import Any

from app.services.llm import call_tool
from app.services.qualities import FIELD_OPTIONS, KEYS, QUALITIES, QUIZ_COVERED

MAX_CONFIDENCE = 0.8
MAX_EVIDENCE_CHARS = 160
MAX_SUMMARY_CHARS = 480
PARTNER = "partner_preferences"
WRAP = "wrap_up"

# Order to probe the qualities the quiz doesn't touch. Front-loads the ones
# that are easiest to draw out with a story and most often weighted highly.
_PROBE_ORDER = [
    "reliable",
    "sense_of_humour",
    "shares_chores",
    "expresses_emotions",
    "no_anger_issues",
    "supportive_not_jealous",
    "notices_small_things",
    "ambitious",
    "protects_not_controls",
    "basic_manners",
    "humble",
    "vibe_match",
    "no_misogyny",
    "no_womanhood_taboo",
]

OPENING = (
    "Hi {name}, I'm the Charms matchmaker. This takes about five minutes and you "
    "can stop whenever you like. To start, what does a good weekend look like for you right now?"
)


def opening_line(name: str) -> str:
    return OPENING.format(name=(name or "there").split(" ")[0])


def plan_targets(max_turns: int) -> list[str]:
    """Targets for agent turns 2..max_turns. Turn 1 is the fixed opener."""
    probes = max(0, max_turns - 3)  # leave room for partner prefs + wrap-up
    return _PROBE_ORDER[:probes] + [PARTNER, WRAP]


def target_for_turn(turn_index: int, max_turns: int) -> str:
    """turn_index is the 1-based index of the agent turn about to be generated."""
    plan = plan_targets(max_turns)
    i = turn_index - 2
    return plan[min(max(i, 0), len(plan) - 1)]


# ---------------------------------------------------------------------------
# Turn generation
# ---------------------------------------------------------------------------

_TURN_SYSTEM = """You are the matchmaker for Charms, a dating app that matches people on character, not photos. You are interviewing {name} by voice.

Everything you write is spoken aloud by a text-to-speech voice:
- One or two short sentences, under 40 words. Exactly one question.
- Plain spoken English. No lists, markdown, emojis, or stage directions.
- Start with a brief, specific reaction to what they just said (a few words), then ask.
- Warm and curious. Don't flatter or praise their answers. Don't sound like a therapist.
- Prefer questions that draw out a real story: a specific time, what they did, what happened next.
- Never name the quality you're probing or say you're assessing them.
- Never ask for their surname, address, employer, or finances.
- If they say they are in danger or in crisis, stop the interview kindly and tell them to contact local emergency services or a crisis line. Set done to true.

{focus}"""

_FOCUS = {
    PARTNER: "Next, ask what they want in a partner: what matters most, and anything that's a dealbreaker (for example smoking, drinking, or wanting something casual vs serious).",
    WRAP: "This is the last turn. Thank them in one sentence, tell them their matchmaker will use this for introductions, and do not ask a question. Set done to true.",
}

TURN_TOOL = {
    "name": "next_turn",
    "description": "The matchmaker's next spoken line.",
    "input_schema": {
        "type": "object",
        "properties": {
            "say": {"type": "string", "description": "What the matchmaker says next."},
            "done": {"type": "boolean", "description": "True only when the interview should end now."},
        },
        "required": ["say", "done"],
    },
}


def focus_text(target: str) -> str:
    if target in _FOCUS:
        return _FOCUS[target]
    return (
        f"Next, steer naturally toward this, without naming it: {QUALITIES[target]} "
        "If their last answer was vague but interesting, you may ask one follow-up on it instead."
    )


def to_messages(turns: list[dict[str, str]]) -> list[dict[str, str]]:
    """Map stored turns to Messages API format. The model plays the agent.

    The Messages API requires the first message to be from the user, so the fixed
    opener is folded into a short framing user message.
    """
    msgs: list[dict[str, str]] = [{"role": "user", "content": "(The interview has started.)"}]
    for t in turns:
        role = "assistant" if t["role"] == "agent" else "user"
        if msgs[-1]["role"] == role:
            msgs[-1]["content"] += "\n" + t["text"]
        else:
            msgs.append({"role": role, "content": t["text"]})
    if msgs[-1]["role"] == "assistant":
        msgs.append({"role": "user", "content": "(No answer. Gently move on.)"})
    return msgs


def next_turn(name: str, turns: list[dict[str, str]], target: str) -> dict[str, Any]:
    payload = call_tool(
        system=_TURN_SYSTEM.format(name=name or "them", focus=focus_text(target)),
        messages=to_messages(turns),
        tool=TURN_TOOL,
        max_tokens=200,
    )
    say = str(payload.get("say") or "").strip()
    if not say:
        say = "Thanks for sharing that. Tell me more about what matters to you in a relationship."
    return {"say": say, "done": bool(payload.get("done")) or target == WRAP}


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------

_EXTRACT_SYSTEM = f"""You read a dating-app onboarding interview and record what it shows about the speaker's character. Score behavior, not self-description.

For traits, only include qualities the transcript gives real evidence about. Score 1 to 5 where 3 is ordinary. Confidence guide:
- 0.2 to 0.4: they only described themselves ("I'm patient").
- 0.5 to 0.7: one concrete story showing the behavior.
- 0.8: several consistent stories.
Evidence is a short paraphrase of what they said, under 20 words, in third person. Never quote sensitive details like health conditions.

For partner_priorities, include only what they clearly said they want in a partner (weight 5 = essential).
For dealbreakers, include only explicit must-nots about a partner, using the allowed values.
The summary is private notes for the matchmaker: under 60 words, third person, plain and specific.

Quality definitions:
""" + "\n".join(f"- {k}: {d}" for k, d in QUALITIES.items())

EXTRACT_TOOL = {
    "name": "record_insights",
    "description": "Record evidence-backed insights from the interview.",
    "input_schema": {
        "type": "object",
        "properties": {
            "traits": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "quality_key": {"type": "string", "enum": KEYS},
                        "score": {"type": "number", "minimum": 1, "maximum": 5},
                        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                        "evidence": {"type": "string"},
                    },
                    "required": ["quality_key", "score", "confidence", "evidence"],
                },
            },
            "partner_priorities": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "quality_key": {"type": "string", "enum": KEYS},
                        "weight": {"type": "integer", "minimum": 1, "maximum": 5},
                    },
                    "required": ["quality_key", "weight"],
                },
            },
            "dealbreakers": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "field": {"type": "string", "enum": list(FIELD_OPTIONS)},
                        "value": {"type": "string", "enum": sorted({v for vs in FIELD_OPTIONS.values() for v in vs})},
                    },
                    "required": ["field", "value"],
                },
            },
            "summary": {"type": "string"},
        },
        "required": ["traits", "partner_priorities", "dealbreakers", "summary"],
    },
}


def transcript_text(turns: list[dict[str, str]]) -> str:
    return "\n".join(f"{'Matchmaker' if t['role'] == 'agent' else 'Them'}: {t['text']}" for t in turns)


def _num(x: Any, lo: float, hi: float) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if v != v:  # NaN
        return None
    return min(hi, max(lo, v))


def sanitize_insights(raw: dict[str, Any]) -> dict[str, Any]:
    """Validate model output against the schema we actually trust.

    The tool schema constrains the model, but nothing guarantees it obeyed,
    so every field is re-checked here: unknown keys dropped, numbers clamped,
    duplicates collapsed to the most confident, dealbreaker values checked
    against their own field's options.
    """
    traits: dict[str, dict[str, Any]] = {}
    for t in raw.get("traits") or []:
        if not isinstance(t, dict) or t.get("quality_key") not in QUALITIES:
            continue
        score = _num(t.get("score"), 1, 5)
        conf = _num(t.get("confidence"), 0, MAX_CONFIDENCE)
        if score is None or conf is None or conf == 0:
            continue
        k = t["quality_key"]
        if k in traits and traits[k]["confidence"] >= conf:
            continue
        traits[k] = {
            "quality_key": k,
            "score": round(score, 2),
            "confidence": round(conf, 2),
            "evidence": str(t.get("evidence") or "")[:MAX_EVIDENCE_CHARS].strip(),
        }

    priorities: dict[str, int] = {}
    for p in raw.get("partner_priorities") or []:
        if isinstance(p, dict) and p.get("quality_key") in QUALITIES:
            w = _num(p.get("weight"), 1, 5)
            if w is not None:
                priorities[p["quality_key"]] = int(round(w))

    dealbreakers: list[dict[str, str]] = []
    for d in raw.get("dealbreakers") or []:
        if not isinstance(d, dict):
            continue
        f, v = d.get("field"), d.get("value")
        if f in FIELD_OPTIONS and v in FIELD_OPTIONS[f] and {"field": f, "value": v} not in dealbreakers:
            dealbreakers.append({"field": f, "value": v})

    return {
        "traits": [traits[k] for k in KEYS if k in traits],
        "partner_priorities": [{"quality_key": k, "weight": priorities[k]} for k in KEYS if k in priorities],
        "dealbreakers": dealbreakers,
        "summary": str(raw.get("summary") or "")[:MAX_SUMMARY_CHARS].strip(),
    }


def extract(turns: list[dict[str, str]]) -> dict[str, Any]:
    raw = call_tool(
        system=_EXTRACT_SYSTEM,
        messages=[{"role": "user", "content": f"Interview transcript:\n\n{transcript_text(turns)}"}],
        tool=EXTRACT_TOOL,
        max_tokens=1500,
    )
    return sanitize_insights(raw)
