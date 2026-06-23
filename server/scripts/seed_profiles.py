"""Seed demo profiles (male, female, lgbtq) into Supabase for local development.

Profiles are 1:1 with auth.users, so each one is created via the Auth Admin API
(service-role key) and then given a profile row plus the same data every
gender gets in the gender-symmetric model:

  * priority_weights -> their 1..5 priority for each of the 23 qualities
  * quiz_scores       -> their 1..5 character score for each quality
  * quiz_answers      -> their picked Likert label per situational question

Nothing about the people is hardcoded: names, ages, cities and bios are generated
with Faker, and the quality keys are read back from the `qualities` table (which
must already be seeded via supabase/seed.sql).

Usage (from the server/ directory, venv active):

    python scripts/seed_profiles.py                          # 4 of each gender
    python scripts/seed_profiles.py --male 3 --female 3 --lgbtq 3
    python scripts/seed_profiles.py --clean                  # delete prior seed users first

Every generated account uses the SEED_DOMAIN email suffix so a re-run with
--clean can find and remove exactly what this script created (deleting the auth
user cascades to its profile, weights, scores and answers).
"""

from __future__ import annotations

import argparse
import random
import sys
import urllib.request
import uuid
from pathlib import Path

# Allow `python scripts/seed_profiles.py` to import the app package.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from faker import Faker  # noqa: E402
from supabase import Client, create_client  # noqa: E402

from app.config import get_settings  # noqa: E402

SEED_DOMAIN = "seed.charms.test"        # marks accounts this script owns
DEFAULT_PASSWORD = "CharmsSeed!23"      # shared login for all demo accounts
GENDERS = ["male", "female", "lgbtq"]
VERIFICATIONS = ["unverified", "pending", "verified", "rejected"]
VERIFICATION_WEIGHTS = [3, 1, 5, 1]     # most demo users land "verified"

PHOTO_BUCKET = "profile-photos"         # must match client/src/lib/photos.ts
PORTRAIT_BASE = "https://randomuser.me/api/portraits"  # free face photos

# Optional "about you" details (mirror client/src/lib/constants/profileFields.ts).
DRINKING_OPTIONS = ["Never", "Socially", "Often"]
SMOKING_OPTIONS = ["No", "Sometimes", "Yes"]
EXERCISE_OPTIONS = ["Rarely", "Sometimes", "Often", "Daily"]
RELATIONSHIP_GOALS = ["Long-term relationship", "Marriage", "Short-term", "Still figuring it out"]
EDUCATIONS = [
    "High school", "Some college", "BA, State University", "BSc, NYU",
    "MBA, Wharton", "MSc, Stanford", "Trade school", "Self-taught",
]
INTEREST_POOL = [
    "Cooking", "Travel", "Reading", "Fitness", "Music", "Hiking", "Photography",
    "Movies", "Gaming", "Art", "Coffee", "Volunteering", "Cycling", "Yoga",
    "Live music", "Board games", "Running", "Painting",
]

# The 14 situational quiz question ids (mirrors client/src/lib/constants/
# situational-quiz.ts) and the 5-point scale every profile answers with.
SITUATIONAL_QUESTION_IDS = [
    "s1_online_hate", "s2_stereotyped_in_front_of_partner", "s3_bill_no_strings",
    "s4_seclusion_deserves", "s5_early_end_owed_time", "s6_upset_at_declined_kiss",
    "s7_recover_money_framing", "s8_boundary_pushed_to_stay", "s9_workplace_discrimination",
    "s10_family_rejection", "s11_outed_without_consent", "s12_dating_app_bait_harassment",
    "s13_public_harassment_holding_hands", "s14_conversion_pressure",
]
LIKERT_LABELS = ["Strongly agree", "Agree", "Neutral", "Disagree", "Strongly disagree"]
# Most demo profiles land on the "green flag" side of these statements.
LIKERT_WEIGHTS = [4, 3, 1, 0.5, 0.5]

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


def make_details() -> dict:
    """Random values for the optional profile-detail columns."""
    return {
        "profession": fake.job(),
        "education": random.choice(EDUCATIONS),
        "height_cm": random.randint(155, 198),
        "drinking": random.choice(DRINKING_OPTIONS),
        "smoking": random.choice(SMOKING_OPTIONS),
        "exercise": random.choice(EXERCISE_OPTIONS),
        "relationship_goal": random.choice(RELATIONSHIP_GOALS),
        "interests": random.sample(INTEREST_POOL, random.randint(3, 6)),
    }


def upload_photos(sb: Client, uid: str, gender: str) -> list[str]:
    """Download 1-3 face portraits and upload them to the private photo bucket.

    Returns the storage paths (to write into profiles.photos). Network failures
    are non-fatal: the person just ends up with fewer/no photos. The service-role
    client bypasses RLS, so the demo gating is exercised only on the read side.
    """
    # randomuser.me only has two portrait sets; lgbtq demo profiles draw from
    # either at random since gender identity isn't tied to a single look.
    portrait_set = {"male": "men", "female": "women"}.get(gender, random.choice(["men", "women"]))
    paths: list[str] = []
    for idx in random.sample(range(0, 90), random.randint(1, 3)):
        try:
            with urllib.request.urlopen(f"{PORTRAIT_BASE}/{portrait_set}/{idx}.jpg", timeout=20) as r:
                data = r.read()
        except Exception as exc:  # noqa: BLE001 — best-effort seeding
            print(f"    (skipped a photo: {exc})")
            continue
        path = f"{uid}/{uuid.uuid4().hex}.jpg"
        try:
            sb.storage.from_(PHOTO_BUCKET).upload(
                path, data, {"content-type": "image/jpeg", "upsert": "true"}
            )
            paths.append(path)
        except Exception as exc:  # noqa: BLE001
            print(f"    (photo upload failed: {exc})")
    return paths


def create_person(
    sb: Client, gender: str, keys: list[str], password: str, n: int, with_photos: bool
) -> dict:
    """Create one auth user + profile + quiz/priority data. Returns a summary.

    Emails are deterministic (male1@, female1@, lgbtq1@, ...) so the demo
    logins are predictable without reading this script's output.
    """
    first = {
        "male": fake.first_name_male,
        "female": fake.first_name_female,
    }.get(gender, fake.first_name)()
    email = f"{gender}{n}@{SEED_DOMAIN}"

    # Random, occasionally-empty interest set ("empty" = open to everyone).
    interested_in = random.sample(GENDERS, random.randint(0, len(GENDERS)))

    user = sb.auth.admin.create_user(
        {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"seed": True, "gender": gender},
        }
    )
    uid = user.user.id

    sb.table("profiles").insert(
        {
            "id": uid,
            "gender": gender,
            "interested_in": interested_in or None,
            "display_name": first,
            "age": random.randint(22, 38),
            "city": fake.city(),
            "bio": make_bio(),
            "verification": random.choices(VERIFICATIONS, weights=VERIFICATION_WEIGHTS)[0],
            **make_details(),
        }
    ).execute()

    sb.table("priority_weights").insert(
        [{"profile_id": uid, "quality_key": k, "weight": random.randint(1, 5)} for k in keys]
    ).execute()
    sb.table("quiz_scores").insert(
        [
            {"profile_id": uid, "quality_key": k, "score": round(random.uniform(1, 5), 2)}
            for k in keys
        ]
    ).execute()
    sb.table("quiz_answers").insert(
        [
            {
                "profile_id": uid,
                "question_id": qid,
                "answer": random.choices(LIKERT_LABELS, weights=LIKERT_WEIGHTS)[0],
            }
            for qid in SITUATIONAL_QUESTION_IDS
        ]
    ).execute()

    if with_photos:
        paths = upload_photos(sb, uid, gender)
        if paths:
            sb.table("profiles").update({"photos": paths}).eq("id", uid).execute()

    return {"email": email, "gender": gender, "name": first, "id": uid}


def remove_photos(sb: Client, uid: str) -> None:
    """Best-effort delete of a user's photo folder (auth delete won't touch it)."""
    try:
        files = sb.storage.from_(PHOTO_BUCKET).list(uid)
        names = [f"{uid}/{f['name']}" for f in (files or []) if f.get("name")]
        if names:
            sb.storage.from_(PHOTO_BUCKET).remove(names)
    except Exception:  # noqa: BLE001 — bucket may not exist yet; ignore
        pass


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
                remove_photos(sb, u.id)
                sb.auth.admin.delete_user(u.id)
                removed += 1
        page += 1
    return removed


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo profiles into Supabase.")
    parser.add_argument("--male", type=int, default=4, help="number of male profiles (default 4)")
    parser.add_argument("--female", type=int, default=4, help="number of female profiles (default 4)")
    parser.add_argument("--lgbtq", type=int, default=4, help="number of LGBTQ+ profiles (default 4)")
    parser.add_argument("--password", default=DEFAULT_PASSWORD, help="shared login password")
    parser.add_argument("--clean", action="store_true", help="delete prior seed users first")
    parser.add_argument(
        "--no-photos", action="store_true", help="skip downloading/uploading demo photos"
    )
    args = parser.parse_args()

    sb = client()
    with_photos = not args.no_photos

    if args.clean:
        print(f"Removing existing @{SEED_DOMAIN} accounts...")
        print(f"  deleted {clean(sb)} account(s).\n")

    keys = quality_keys(sb)
    counts = {"male": args.male, "female": args.female, "lgbtq": args.lgbtq}
    photo_note = "with demo photos" if with_photos else "no photos"
    total = sum(counts.values())
    print(f"Seeding {total} profiles {counts} ({photo_note}) against {len(keys)} qualities...\n")

    created = []
    for gender, count in counts.items():
        for i in range(1, count + 1):
            created.append(create_person(sb, gender, keys, args.password, i, with_photos))

    for p in created:
        print(f"  {p['gender']:<7}  {p['name']:<12}  {p['email']}")

    print(f"\nDone. {len(created)} profiles created. Shared password: {args.password}")


if __name__ == "__main__":
    main()
