from app.services.interviewer import (
    MAX_CONFIDENCE,
    PARTNER,
    WRAP,
    plan_targets,
    sanitize_insights,
    target_for_turn,
    to_messages,
)


def test_plan_ends_with_partner_prefs_then_wrap_up():
    plan = plan_targets(9)
    assert plan[-2:] == [PARTNER, WRAP]
    assert len(plan) == 8  # agent turns 2..9


def test_target_for_turn_clamps_past_the_end():
    assert target_for_turn(2, 9) == plan_targets(9)[0]
    assert target_for_turn(9, 9) == WRAP
    assert target_for_turn(50, 9) == WRAP


def test_tiny_budget_still_wraps_up():
    assert plan_targets(2) == [PARTNER, WRAP]


def test_messages_start_with_user_and_alternate():
    turns = [
        {"role": "agent", "text": "Hi, what's a good weekend?"},
        {"role": "user", "text": "Hiking."},
        {"role": "user", "text": "And cooking."},
    ]
    msgs = to_messages(turns)
    assert msgs[0]["role"] == "user"
    assert [m["role"] for m in msgs] == ["user", "assistant", "user"]
    assert "cooking" in msgs[-1]["content"]


def test_messages_never_end_on_assistant():
    msgs = to_messages([{"role": "agent", "text": "Hi"}])
    assert msgs[-1]["role"] == "user"


def test_sanitize_drops_unknowns_clamps_and_dedupes():
    raw = {
        "traits": [
            {"quality_key": "reliable", "score": 9, "confidence": 0.95, "evidence": "Shows up."},
            {"quality_key": "reliable", "score": 2, "confidence": 0.3, "evidence": "Weaker duplicate."},
            {"quality_key": "made_up", "score": 4, "confidence": 0.5, "evidence": "x"},
            {"quality_key": "humble", "score": "NaN", "confidence": 0.5, "evidence": "x"},
            {"quality_key": "patient", "score": 4, "confidence": 0, "evidence": "zero conf"},
        ],
        "partner_priorities": [{"quality_key": "sense_of_humour", "weight": 7}, {"quality_key": "nope", "weight": 3}],
        "dealbreakers": [
            {"field": "smoking", "value": "Yes"},
            {"field": "smoking", "value": "Yes"},
            {"field": "smoking", "value": "Marriage"},
            {"field": "height", "value": "Yes"},
        ],
        "summary": "x" * 2000,
    }
    out = sanitize_insights(raw)
    assert out["traits"] == [{"quality_key": "reliable", "score": 5.0, "confidence": MAX_CONFIDENCE, "evidence": "Shows up."}]
    assert out["partner_priorities"] == [{"quality_key": "sense_of_humour", "weight": 5}]
    assert out["dealbreakers"] == [{"field": "smoking", "value": "Yes"}]
    assert len(out["summary"]) <= 480


def test_sanitize_survives_garbage():
    assert sanitize_insights({"traits": "nope", "dealbreakers": [1, None]})["traits"] == []
