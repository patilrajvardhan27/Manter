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


def create_person(sb: Client, role: str, keys: list[str], password: str) -> dict:
    """Create one auth user + profile (+ role-specific data). Returns a summary."""
    first = fake.first_name_female() if role == "woman" else fake.first_name_male()
    email = f"{first.lower()}.{fake.uuid4()[:8]}@{SEED_DOMAIN}"

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
    for _ in range(args.women):
        created.append(create_person(sb, "woman", keys, args.password))
    for _ in range(args.men):
        created.append(create_person(sb, "man", keys, args.password))

    for p in created:
        print(f"  {p['role']:<5}  {p['name']:<12}  {p['email']}")

    print(f"\nDone. {len(created)} profiles created. Shared password: {args.password}")


if __name__ == "__main__":
    main()
