"""Seed demo profiles (women + men) into Supabase for local development.

Profiles are 1:1 with auth.users, so each one is created via the Auth Admin API
(service-role key) and then given a profile row plus the role-specific data the
app needs to be useful:

  * women -> woman_weights   (her 1..5 priority for each of the 23 qualities)
  * men   -> man_quiz_scores (his 1..5 self-assessment for each quality)

Nothing about the people is hardcoded: names, ages, cities and bios are generated
with Faker, and the quality keys are read back from the `qualities` table (which
must already be seeded via supabase/seed.sql).

Usage (from the server/ directory, venv active):

    python scripts/seed_profiles.py                 # 5 women + 5 men
    python scripts/seed_profiles.py --women 3 --men 8
    python scripts/seed_profiles.py --clean         # delete prior seed users first

Every generated account uses the SEED_DOMAIN email suffix so a re-run with
--clean can find and remove exactly what this script created (deleting the auth
user cascades to its profile, weights and scores).
"""

from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

# Allow `python scripts/seed_profiles.py` to import the app package.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from faker import Faker  # noqa: E402
from supabase import Client, create_client  # noqa: E402

from app.config import get_settings  # noqa: E402

SEED_DOMAIN = "seed.manter.test"        # marks accounts this script owns
DEFAULT_PASSWORD = "ManterSeed!23"      # shared login for all demo accounts
VERIFICATIONS = ["unverified", "pending", "verified", "rejected"]
VERIFICATION_WEIGHTS = [3, 1, 5, 1]     # most demo users land "verified"

# Free-text answers to the 6 default behavioral questions so seeded men show
# real "Your answers" content (question_ids mirror client/src/lib/constants/quiz.ts).
# Several variants per question; one is picked at random per man.
SEED_ANSWERS: dict[str, list[str]] = {
    "q1_decision": [
        "It's your career and your call — go for it. We'll figure out the distance together and I'll visit every chance I get.",
        "Honestly that's a huge opportunity. I'd be proud of you. A year apart is hard but we can make it work.",
        "Let's talk it through, but I don't want to be the reason you pass on something this big.",
    ],
    "q2_conflict": [
        "I'd stop, admit I was wrong, and apologize properly. Being right matters less than being fair to her.",
        "I'd own it in the moment — 'you're right, I shouldn't have said that' — and ask how to make it better.",
        "I'd take a breath, acknowledge my part, and not let pride drag the argument out.",
    ],
    "q3_boundary": [
        "Completely her pace, no pressure ever. I'd rather she feel safe than rushed, and I'd tell her that clearly.",
        "That's totally fine. I'd never bring it up to push — I'd just ask what helps her feel comfortable with me.",
        "No clock here. Whenever she's ready, or not — both are okay.",
    ],
    "q4_chores": [
        "I'd cook tonight and take the dishes tomorrow, or we split it however's easier. It's both our home.",
        "I'd just start cleaning and tell her to rest — we trade off, no keeping score.",
        "Let's divide it 50-50. I'd handle the kitchen, she takes the laundry, done in twenty minutes together.",
    ],
    "q5_friends": [
        "I'd call it out, even if it's awkward. 'Not funny, drop it.' I'm not laughing at women to fit in.",
        "I'd shut it down in the moment. My friends know I don't find that stuff funny.",
        "I'd say something there and then — staying silent feels like agreeing.",
    ],
    "q6_emotion": [
        "I'd actually open up about it. Bottling things up never helped me, and she should know what's going on with me.",
        "I'd tell her honestly that I'm having a rough time. I don't do the 'I'm fine' thing.",
        "I'd share what's weighing on me — being able to be vulnerable with her is the point.",
    ],
}

fake = Faker()


def client() -> Client:
    s = get_settings()
    if not s.supabase_url or "your-project" in s.supabase_url:
        sys.exit("SUPABASE_URL is not set in server/.env")
    if not s.supabase_service_role_key or s.supabase_service_role_key == "your-service-role-key":
        sys.exit("SUPABASE_SERVICE_ROLE_KEY is not set in server/.env")
    return create_client(s.supabase_url, s.supabase_service_role_key)


def quality_keys(sb: Client) -> list[str]:
    rows = sb.table("qualities").select("key").execute().data
    if not rows:
        sys.exit("The `qualities` table is empty — run supabase/seed.sql first.")
    return [r["key"] for r in rows]


def make_bio() -> str:
    interests = ", ".join(fake.words(nb=3, unique=True))
    return f"{fake.job()}. Into {interests}. {fake.sentence(nb_words=10)}"


def create_person(sb: Client, role: str, keys: list[str], password: str, n: int) -> dict:
    """Create one auth user + profile (+ role-specific data). Returns a summary.

    Emails are deterministic (woman1@, man1@, ...) so the demo logins are
    predictable without reading this script's output.
    """
    first = fake.first_name_female() if role == "woman" else fake.first_name_male()
    email = f"{role}{n}@{SEED_DOMAIN}"

    user = sb.auth.admin.create_user(
        {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"seed": True, "role": role},
        }
    )
    uid = user.user.id

    sb.table("profiles").insert(
        {
            "id": uid,
            "role": role,
            "display_name": first,
            "age": random.randint(22, 38),
            "city": fake.city(),
            "bio": make_bio(),
            "verification": random.choices(VERIFICATIONS, weights=VERIFICATION_WEIGHTS)[0],
        }
    ).execute()

    if role == "woman":
        sb.table("woman_weights").insert(
            [{"woman_id": uid, "quality_key": k, "weight": random.randint(1, 5)} for k in keys]
        ).execute()
    else:
        sb.table("man_quiz_scores").insert(
            [
                {"man_id": uid, "quality_key": k, "score": round(random.uniform(1, 5), 2)}
                for k in keys
            ]
        ).execute()
        # Free-text answers to the default questions, so his profile has content.
        sb.table("quiz_answers").insert(
            [
                {"man_id": uid, "question_id": qid, "answer": random.choice(variants)}
                for qid, variants in SEED_ANSWERS.items()
            ]
        ).execute()

    return {"email": email, "role": role, "name": first, "id": uid}


def clean(sb: Client) -> int:
    """Delete every auth user under SEED_DOMAIN (cascades to profile data)."""
    removed = 0
    page = 1
    while True:
        result = sb.auth.admin.list_users(page=page, per_page=200)
        users = result if isinstance(result, list) else getattr(result, "users", [])
        if not users:
            break
        for u in users:
            if (u.email or "").endswith(f"@{SEED_DOMAIN}"):
                sb.auth.admin.delete_user(u.id)
                removed += 1
        page += 1
    return removed


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo profiles into Supabase.")
    parser.add_argument("--women", type=int, default=5, help="number of women (default 5)")
    parser.add_argument("--men", type=int, default=5, help="number of men (default 5)")
    parser.add_argument("--password", default=DEFAULT_PASSWORD, help="shared login password")
    parser.add_argument("--clean", action="store_true", help="delete prior seed users first")
    args = parser.parse_args()

    sb = client()

    if args.clean:
        print(f"Removing existing @{SEED_DOMAIN} accounts...")
        print(f"  deleted {clean(sb)} account(s).\n")

    keys = quality_keys(sb)
    print(f"Seeding {args.women} women + {args.men} men against {len(keys)} qualities...\n")

    created = []
    for i in range(1, args.women + 1):
        created.append(create_person(sb, "woman", keys, args.password, i))
    for i in range(1, args.men + 1):
        created.append(create_person(sb, "man", keys, args.password, i))

    for p in created:
        print(f"  {p['role']:<5}  {p['name']:<12}  {p['email']}")

    print(f"\nDone. {len(created)} profiles created. Shared password: {args.password}")


if __name__ == "__main__":
    main()
