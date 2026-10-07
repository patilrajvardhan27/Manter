"""The 23 character qualities, mirrored from client/src/lib/constants/qualities.ts.

The client's blurbs are written for one audience ("her"); the interviewer and
the extractor need neutral, behavior-level descriptions instead, so those live
here. tests/test_qualities_sync.py fails if the keys drift from the client.
"""

QUALITIES: dict[str, str] = {
    "respects_decisions": "Respects a partner's decisions and independence.",
    "protects_not_controls": "Protective without being controlling.",
    "supportive_not_jealous": "Celebrates a partner's success instead of competing or getting jealous.",
    "trustworthy": "Loyal, honest, kind, and caring.",
    "vibe_match": "Curious about ideas; conversations flow.",
    "takes_her_side": "Speaks up for a partner when it counts.",
    "notices_small_things": "Pays attention to small details about people.",
    "patient": "Patient; gives space; doesn't rush intimacy.",
    "emotionally_intelligent": "Emotionally mature; reads and handles feelings well.",
    "sense_of_humour": "Playful; has a sense of humour.",
    "respects_boundaries": "Respects boundaries; never pressures.",
    "feels_safe": "People feel safe and unjudged around them.",
    "confident_self_respect": "Secure in themselves, with healthy self-respect.",
    "expresses_emotions": "Can talk about their own feelings and be vulnerable.",
    "no_womanhood_taboo": "Matter-of-fact and supportive about bodies, health, and periods.",
    "no_misogyny": "Doesn't put any group down to fit in with friends.",
    "ambitious": "Driven; works hard toward goals.",
    "no_anger_issues": "Stays calm under stress; no explosive anger.",
    "shares_chores": "Shares household work and cooking as a real 50-50.",
    "reliable": "Follows through on what they say they'll do.",
    "basic_manners": "Treats people well regardless of money, looks, or status.",
    "humble": "Humble and down to earth.",
    "no_ego": "Can admit being wrong and let go of being right.",
}

KEYS: list[str] = list(QUALITIES)
KEY_INDEX: dict[str, int] = {k: i for i, k in enumerate(KEYS)}

# Qualities the 14-scenario quiz actually measures (from situational-quiz.ts).
# The other 14 sit at the neutral prior until the voice interview adds evidence,
# so the interviewer targets those first.
QUIZ_COVERED: frozenset[str] = frozenset(
    {
        "takes_her_side",
        "feels_safe",
        "confident_self_respect",
        "respects_boundaries",
        "no_ego",
        "respects_decisions",
        "patient",
        "trustworthy",
        "emotionally_intelligent",
    }
)

# Option vocabularies for structured profile fields (profileFields.ts).
FIELD_OPTIONS: dict[str, tuple[str, ...]] = {
    "smoking": ("No", "Sometimes", "Yes"),
    "drinking": ("Never", "Socially", "Often"),
    "relationship_goal": ("Long-term relationship", "Marriage", "Short-term", "Still figuring it out"),
}
