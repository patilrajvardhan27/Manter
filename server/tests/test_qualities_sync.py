"""Guards the Python mirrors against drifting from the client's constants."""

import re
from pathlib import Path

from app.services.qualities import FIELD_OPTIONS, KEYS, QUIZ_COVERED

CLIENT = Path(__file__).resolve().parents[2] / "client" / "src" / "lib" / "constants"


def test_quality_keys_match_client_in_order():
    ts = (CLIENT / "qualities.ts").read_text()
    client_keys = re.findall(r'\{\s*key:\s*"([a-z_]+)"', ts)
    assert client_keys == KEYS


def test_quiz_covered_matches_client_quiz():
    ts = (CLIENT / "situational-quiz.ts").read_text()
    used = set(re.findall(r'key:\s*"([a-z_]+)"', ts))
    assert used == set(QUIZ_COVERED)


def test_field_options_match_client():
    ts = (CLIENT / "profileFields.ts").read_text()
    for const, field in [
        ("SMOKING_OPTIONS", "smoking"),
        ("DRINKING_OPTIONS", "drinking"),
        ("RELATIONSHIP_GOALS", "relationship_goal"),
    ]:
        block = re.search(rf"{const} = \[(.*?)\]", ts, re.S).group(1)
        assert tuple(re.findall(r'"([^"]+)"', block)) == FIELD_OPTIONS[field]


def test_interviewer_probes_exactly_what_the_quiz_misses():
    from app.services.interviewer import _PROBE_ORDER

    assert set(_PROBE_ORDER) == set(KEYS) - QUIZ_COVERED
    assert len(_PROBE_ORDER) == len(set(_PROBE_ORDER))
