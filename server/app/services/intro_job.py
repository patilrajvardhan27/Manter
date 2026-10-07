"""One introduction round, end to end, against Supabase (service role).

    expire stale intros -> load pool -> learn offsets -> match -> write intros

Run it from cron (POST /matchmaker/run) or the CLI (scripts/run_matchmaker.py).
It is safe to re-run: people already holding a pending intro are skipped, and
pairs that were ever introduced are excluded by a unique index as well as here.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from supabase import Client

from app.config import get_settings
from app.services.matchmaker import Outcome, Person, choose_introductions, learn_offsets
from app.services.qualities import KEYS

PAGE = 1000  # Supabase's default max rows per request
RESPONSE_WEIGHT = 0.5  # interested/pass on an intro: noisy, made before meeting
FEEDBACK_WEIGHT = 1.0  # "would meet again" after matching: the label that matters


def fetch_all(sb: Client, table: str, columns: str, **eq: Any) -> list[dict]:
    """Page through a table. Without this, reads silently cap at 1,000 rows,
    which at 23 score rows per person truncates after about 43 users."""
    out: list[dict] = []
    start = 0
    while True:
        q = sb.table(table).select(columns)
        for k, v in eq.items():
            q = q.eq(k, v)
        rows = q.range(start, start + PAGE - 1).execute().data
        out.extend(rows)
        if len(rows) < PAGE:
            return out
        start += PAGE


def _grouped(rows: list[dict], key: str, field: str, value: str) -> dict[str, dict[str, float]]:
    g: dict[str, dict[str, float]] = defaultdict(dict)
    for r in rows:
        g[r[key]][r[field]] = float(r[value])
    return g


def run_round(sb: Client, *, dry_run: bool = False, now: datetime | None = None) -> dict[str, Any]:
    s = get_settings()
    now = now or datetime.now(timezone.utc)

    # 1. Expire intros nobody answered in time, freeing both people up.
    expired = 0
    if not dry_run:
        expired = len(
            sb.table("introductions")
            .update({"status": "expired", "closed_at": now.isoformat()})
            .eq("status", "pending")
            .lt("expires_at", now.isoformat())
            .execute()
            .data
        )

    # 2. Load everything the matcher needs.
    profiles = fetch_all(
        sb, "profiles", "id, gender, interested_in, relationship_goal, smoking, drinking, interests"
    )
    traits = _grouped(fetch_all(sb, "character_scores", "profile_id, quality_key, score"), "profile_id", "quality_key", "score")
    weights = _grouped(fetch_all(sb, "priority_weights", "profile_id, quality_key, weight"), "profile_id", "quality_key", "weight")
    quizzed = {r["profile_id"] for r in fetch_all(sb, "quiz_scores", "profile_id")}
    intros = fetch_all(
        sb, "introductions", "id, a_id, b_id, status, expires_at, a_decision, b_decision"
    )
    feedback = fetch_all(sb, "introduction_feedback", "intro_id, rater_id, would_meet_again")
    matches = fetch_all(sb, "matches", "seeker_id, target_id")

    # 3. Who can be introduced this round.
    busy = {
        pid
        for i in intros
        if i["status"] == "pending" and datetime.fromisoformat(i["expires_at"]) >= now
        for pid in (i["a_id"], i["b_id"])
    }
    excluded = {frozenset((i["a_id"], i["b_id"])) for i in intros}
    excluded |= {frozenset((m["seeker_id"], m["target_id"])) for m in matches}

    # 4. Learn each person's offsets from their own outcomes.
    pop_mean = {
        k: (sum(t.get(k, 3.0) for t in traits.values()) / len(traits)) if traits else 3.0 for k in KEYS
    }
    outcomes: dict[str, list[Outcome]] = defaultdict(list)
    by_intro = {i["id"]: i for i in intros}
    for i in intros:
        for me, other, decision in ((i["a_id"], i["b_id"], i["a_decision"]), (i["b_id"], i["a_id"], i["b_decision"])):
            if decision in ("interested", "pass") and other in traits:
                outcomes[me].append(Outcome(traits[other], decision == "interested", RESPONSE_WEIGHT))
    for f in feedback:
        i = by_intro.get(f["intro_id"])
        if not i:
            continue
        other = i["b_id"] if f["rater_id"] == i["a_id"] else i["a_id"]
        if other in traits:
            outcomes[f["rater_id"]].append(Outcome(traits[other], bool(f["would_meet_again"]), FEEDBACK_WEIGHT))
    offsets = {pid: learn_offsets(o, pop_mean) for pid, o in outcomes.items()} if s.learn_offsets else {}

    # 5. Build the pool and match.
    pool = [
        Person(
            id=p["id"],
            gender=p["gender"],
            interested_in=frozenset(p.get("interested_in") or []),
            traits=traits.get(p["id"], {}),
            weights=weights[p["id"]],
            offsets=offsets.get(p["id"], {}),
            relationship_goal=p.get("relationship_goal"),
            smoking=p.get("smoking"),
            drinking=p.get("drinking"),
            interests=frozenset(p.get("interests") or []),
        )
        for p in profiles
        if p["id"] in weights and p["id"] in quizzed and p["id"] not in busy
    ]
    chosen = choose_introductions(
        pool, excluded_pairs=excluded, min_score=s.intro_min_score, method=s.intro_method
    )

    # 6. Persist.
    if not dry_run:
        rows = [
            {"profile_id": pid, "quality_key": k, "delta": d, "updated_at": now.isoformat()}
            for pid, off in offsets.items()
            for k, d in off.items()
        ]
        learned_ids = list(offsets)
        for chunk in range(0, len(learned_ids), 200):
            sb.table("preference_offsets").delete().in_("profile_id", learned_ids[chunk : chunk + 200]).execute()
        if rows:
            sb.table("preference_offsets").insert(rows).execute()
        if chosen:
            expires = (now + timedelta(hours=s.intro_ttl_hours)).isoformat()
            sb.table("introductions").insert(
                [
                    {
                        "a_id": c.a_id,
                        "b_id": c.b_id,
                        "score": c.score,
                        "reasons_a": c.reasons_a,
                        "reasons_b": c.reasons_b,
                        "expires_at": expires,
                    }
                    for c in chosen
                ]
            ).execute()

    return {
        "dry_run": dry_run,
        "expired": expired,
        "pool": len(pool),
        "busy": len(busy),
        "created": len(chosen),
        "unmatched": len(pool) - 2 * len(chosen),
        "mean_score": round(sum(c.score for c in chosen) / len(chosen), 1) if chosen else None,
        "users_with_learned_offsets": sum(1 for o in offsets.values() if o),
        "intros": [{"a": c.a_id, "b": c.b_id, "score": c.score} for c in chosen] if dry_run else [],
    }
