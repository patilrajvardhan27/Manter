"""Run one introduction round from the command line.

Same code path as POST /matchmaker/run. Use it locally, or point a cron at it.

    python scripts/run_matchmaker.py --dry-run          # show what would happen
    python scripts/run_matchmaker.py                    # expire, learn, match, write
    python scripts/run_matchmaker.py --seed-autorespond # demo: seed accounts answer their intros

--seed-autorespond exists for demos. Seed accounts (see seed_profiles.py) can't
tap buttons, so this answers their pending intros for them: interested when the
pair score clears --accept-at, pass otherwise. The introductions_finalize
trigger then opens a match exactly as it would for a real user.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.intro_job import fetch_all, run_round  # noqa: E402
from app.services.supabase_client import get_client  # noqa: E402

SEED_DOMAIN = "seed.charms.test"  # must match seed_profiles.py


def seed_ids(sb) -> set[str]:
    ids: set[str] = set()
    page = 1
    while True:
        users = sb.auth.admin.list_users(page=page, per_page=1000)
        ids |= {u.id for u in users if (u.email or "").endswith("@" + SEED_DOMAIN)}
        if len(users) < 1000:
            return ids
        page += 1


def autorespond(sb, accept_at: float) -> dict[str, int]:
    seeds = seed_ids(sb)
    counts = {"interested": 0, "pass": 0}
    for i in fetch_all(sb, "introductions", "id, a_id, b_id, score, status, a_decision, b_decision"):
        if i["status"] != "pending":
            continue
        decision = "interested" if float(i["score"]) >= accept_at else "pass"
        for side in ("a", "b"):
            if i[f"{side}_id"] in seeds and i[f"{side}_decision"] is None:
                sb.table("introductions").update({f"{side}_decision": decision}).eq("id", i["id"]).execute()
                counts[decision] += 1
    return counts


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="compute everything, write nothing")
    ap.add_argument("--seed-autorespond", action="store_true", help="answer pending intros for seed accounts")
    ap.add_argument("--accept-at", type=float, default=65.0, help="score at which seed accounts say interested")
    args = ap.parse_args()

    sb = get_client()
    print(json.dumps(run_round(sb, dry_run=args.dry_run), indent=2))
    if args.seed_autorespond and not args.dry_run:
        print("seed responses:", json.dumps(autorespond(sb, args.accept_at)))


if __name__ == "__main__":
    main()
