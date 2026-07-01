"""Seed demo profiles (male, female, lgbtq) into Supabase for local development.

Profiles are 1:1 with auth.users, so each one is created via the Auth Admin API
(service-role key) and then given a profile row plus the same data every
gender gets in the gender-symmetric model:

  * priority_weights -> their 1..5 priority for each of the 23 qualities
  * quiz_scores       -> their 1..5 character score for each quality
  * quiz_answers      -> their picked Likert label per situational question

Rather than randomizing every quality independently (which produces
incoherent people — high on "respects boundaries" and low on "trustworthy"
with no story behind either), each profile is drawn from a small set of
named character archetypes per gender (PERSONAS below). An archetype pins a
handful of standout-high and standout-low qualities and a priorities
skew; everything else gets a light random jitter around a baseline so
repeated instances of the same archetype aren't identical twins.

quiz_answers are then derived FROM the generated quiz_scores rather than
picked independently: the situational quiz only exercises 9 of the 23
qualities (see QUESTION_QUALITIES, mirrored from client/src/lib/constants/
situational-quiz.ts), so each answer is whichever Likert label that
archetype's scores on those two qualities would actually justify. This
keeps a profile's stated attitudes consistent with its character score
instead of the two being generated independently.

Names, ages, cities, professions and other flavor details are generated
with Faker; the quality keys are read back from the `qualities` table
(which must already be seeded via supabase/seed.sql).

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
# situational-quiz.ts) mapped to the two quality keys each answer affects.
# Every question in the bank has `positive: true` on both keys, i.e.
# agreeing with the statement reflects well on both qualities.
QUESTION_QUALITIES: dict[str, tuple[str, str]] = {
    "s1_online_hate": ("takes_her_side", "feels_safe"),
    "s2_stereotyped_in_front_of_partner": ("takes_her_side", "confident_self_respect"),
    "s3_bill_no_strings": ("respects_boundaries", "no_ego"),
    "s4_seclusion_deserves": ("respects_boundaries", "no_ego"),
    "s5_early_end_owed_time": ("respects_decisions", "no_ego"),
    "s6_upset_at_declined_kiss": ("respects_boundaries", "patient"),
    "s7_recover_money_framing": ("trustworthy", "no_ego"),
    "s8_boundary_pushed_to_stay": ("respects_boundaries", "respects_decisions"),
    "s9_workplace_discrimination": ("takes_her_side", "emotionally_intelligent"),
    "s10_family_rejection": ("trustworthy", "feels_safe"),
    "s11_outed_without_consent": ("trustworthy", "respects_decisions"),
    "s12_dating_app_bait_harassment": ("feels_safe", "emotionally_intelligent"),
    "s13_public_harassment_holding_hands": ("takes_her_side", "confident_self_respect"),
    "s14_conversion_pressure": ("respects_decisions", "no_ego"),
}
LIKERT_LABELS = ["Strongly agree", "Agree", "Neutral", "Disagree", "Strongly disagree"]

# ---------------------------------------------------------------------------
# Character archetypes. Each pins a few standout-high/standout-low qualities
# (everything else jitters around `baseline`) plus a priorities skew for what
# they look for in a partner, and a couple of "about you" details that fit
# the character. `label` and `tagline` become the profile's bio.
# ---------------------------------------------------------------------------
PERSONAS: dict[str, list[dict]] = {
    "male": [
        {
            "label": "The Steady One",
            "tagline": "shows up, keeps his word, and never makes you guess where you stand",
            "baseline": 4,
            "high": ["trustworthy", "respects_boundaries", "respects_decisions", "reliable",
                     "no_anger_issues", "emotionally_intelligent", "feels_safe"],
            "low": [],
            "priority_baseline": 3,
            "priority_high": ["emotionally_intelligent", "vibe_match", "supportive_not_jealous"],
            "priority_low": [],
            "details": {"relationship_goal": "Long-term relationship", "exercise": "Often", "drinking": "Socially"},
        },
        {
            "label": "The Charmer",
            "tagline": "the first one to make the whole table laugh, slower to take no for an answer",
            "baseline": 3,
            "high": ["sense_of_humour", "confident_self_respect", "vibe_match"],
            "low": ["respects_boundaries", "no_ego", "patient", "no_anger_issues"],
            "priority_baseline": 3,
            "priority_high": ["sense_of_humour", "vibe_match"],
            "priority_low": ["patient"],
            "details": {"relationship_goal": "Short-term", "drinking": "Often"},
        },
        {
            "label": "The Workhorse",
            "tagline": "married to the hustle — reliable with deadlines, harder to reach emotionally",
            "baseline": 3,
            "high": ["ambitious", "reliable", "trustworthy"],
            "low": ["expresses_emotions", "notices_small_things", "shares_chores"],
            "priority_baseline": 3,
            "priority_high": ["ambitious", "reliable", "basic_manners"],
            "priority_low": [],
            "details": {"relationship_goal": "Marriage", "exercise": "Rarely"},
        },
        {
            "label": "The Old-School Traditionalist",
            "tagline": "opens every door and pays every bill, bristles when she doesn't need saving",
            "baseline": 3,
            "high": ["reliable", "basic_manners", "protects_not_controls"],
            "low": ["no_womanhood_taboo", "humble", "no_ego", "supportive_not_jealous"],
            "priority_baseline": 3,
            "priority_high": ["reliable", "trustworthy"],
            "priority_low": ["ambitious"],
            "details": {"relationship_goal": "Marriage", "exercise": "Sometimes"},
        },
    ],
    "female": [
        {
            "label": "The Grounded Realist",
            "tagline": "steady, direct, and done wasting time on anything less than mutual respect",
            "baseline": 4,
            "high": ["trustworthy", "emotionally_intelligent", "feels_safe", "reliable"],
            "low": [],
            "priority_baseline": 3,
            "priority_high": ["respects_boundaries", "trustworthy", "emotionally_intelligent", "no_anger_issues"],
            "priority_low": [],
            "details": {"relationship_goal": "Long-term relationship"},
        },
        {
            "label": "The Free Spirit",
            "tagline": "quick wit, big plans, allergic to anyone who tries to dim her down",
            "baseline": 3,
            "high": ["sense_of_humour", "vibe_match", "confident_self_respect"],
            "low": ["patient"],
            "priority_baseline": 3,
            "priority_high": ["supportive_not_jealous", "no_ego", "ambitious"],
            "priority_low": [],
            "details": {"relationship_goal": "Still figuring it out"},
        },
        {
            "label": "The Guarded Achiever",
            "tagline": "built her own life after one too many disappointments, doesn't hand over the keys easily",
            "baseline": 3,
            "high": ["ambitious", "reliable", "confident_self_respect"],
            "low": ["expresses_emotions", "patient"],
            "priority_baseline": 3,
            "priority_high": ["no_anger_issues", "respects_boundaries", "reliable", "trustworthy"],
            "priority_low": [],
            "details": {"relationship_goal": "Marriage", "exercise": "Daily"},
        },
        {
            "label": "The Recovering People-Pleaser",
            "tagline": "learning that noticing what she needs isn't the same as asking for too much",
            "baseline": 3,
            "high": ["notices_small_things", "expresses_emotions", "trustworthy"],
            "low": ["confident_self_respect"],
            "priority_baseline": 3,
            "priority_high": ["takes_her_side", "protects_not_controls", "respects_decisions"],
            "priority_low": [],
            "details": {"relationship_goal": "Long-term relationship"},
        },
    ],
    "lgbtq": [
        {
            "label": "The Out & Proud Advocate",
            "tagline": "vocal about who they are, and won't shrink for anyone's comfort",
            "baseline": 4,
            "high": ["confident_self_respect", "no_ego", "trustworthy", "takes_her_side"],
            "low": [],
            "priority_baseline": 3,
            "priority_high": ["trustworthy", "feels_safe", "respects_decisions"],
            "priority_low": [],
            "details": {"relationship_goal": "Long-term relationship"},
        },
        {
            "label": "The Still-Guarded One",
            "tagline": "out to some, careful with the rest, still working out who's safe to trust",
            "baseline": 3,
            "high": ["patient", "emotionally_intelligent", "trustworthy"],
            "low": ["confident_self_respect"],
            "priority_baseline": 3,
            "priority_high": ["feels_safe", "trustworthy", "patient", "respects_decisions"],
            "priority_low": [],
            "details": {"relationship_goal": "Still figuring it out"},
        },
        {
            "label": "The Playful Connector",
            "tagline": "leads with humor and feeling, less bothered about five-year plans",
            "baseline": 3,
            "high": ["sense_of_humour", "vibe_match", "expresses_emotions"],
            "low": ["reliable", "ambitious"],
            "priority_baseline": 3,
            "priority_high": ["vibe_match", "sense_of_humour", "supportive_not_jealous"],
            "priority_low": [],
            "details": {"relationship_goal": "Short-term"},
        },
        {
            "label": "The One Who's Been Burned",
            "tagline": "keeps a wall up after getting hurt before, tests people before trusting them",
            "baseline": 3,
            "high": ["confident_self_respect", "no_anger_issues"],
            "low": ["expresses_emotions", "respects_decisions"],
            "priority_baseline": 3,
            "priority_high": ["trustworthy", "respects_boundaries", "no_anger_issues"],
            "priority_low": [],
            "details": {"relationship_goal": "Still figuring it out"},
        },
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


def scaled_scores(keys: list[str], baseline: int, high: list[str], low: list[str]) -> dict[str, float]:
    """A profile's 1..5 character score per quality, built from an archetype.

    Standout qualities land near the top/bottom of the scale; everything
    else jitters around the archetype's baseline so repeats of the same
    archetype aren't identical.
    """
    scores = {}
    for k in keys:
        if k in high:
            scores[k] = round(random.uniform(4.2, 5.0), 2)
        elif k in low:
            scores[k] = round(random.uniform(1.0, 2.3), 2)
        else:
            scores[k] = round(min(5.0, max(1.0, random.uniform(baseline - 0.7, baseline + 0.7))), 2)
    return scores


def scaled_weights(keys: list[str], baseline: int, high: list[str], low: list[str]) -> dict[str, int]:
    """A profile's 1..5 priority weight per quality, built from an archetype."""
    weights = {}
    for k in keys:
        if k in high:
            weights[k] = 5
        elif k in low:
            weights[k] = random.choice([1, 2])
        else:
            weights[k] = min(5, max(1, baseline + random.choice([-1, 0, 0, 1])))
    return weights


def likert_answers_from_scores(scores: dict[str, float]) -> dict[str, str]:
    """Derive each situational-quiz answer from the two qualities it affects.

    Keeps stated attitudes consistent with character score instead of
    generating the two independently — an archetype low on respects_boundaries
    lands on "Disagree"/"Neutral" for the boundary-pushing scenarios, etc.
    """
    answers = {}
    for qid, (k1, k2) in QUESTION_QUALITIES.items():
        avg = (scores[k1] + scores[k2]) / 2
        if avg >= 4.3:
            label = "Strongly agree"
        elif avg >= 3.4:
            label = "Agree"
        elif avg >= 2.5:
            label = "Neutral"
        elif avg >= 1.6:
            label = "Disagree"
        else:
            label = "Strongly disagree"
        answers[qid] = label
    return answers


def make_bio(persona: dict) -> str:
    interests = ", ".join(fake.words(nb=3, unique=True))
    tagline = persona["tagline"]
    tagline = tagline[0].upper() + tagline[1:]
    return f"{tagline}. {fake.job()} by day, into {interests}."


def make_details(persona: dict) -> dict:
    """Random values for the optional profile-detail columns, with the
    archetype's own overrides (e.g. relationship_goal) applied on top."""
    d = {
        "profession": fake.job(),
        "education": random.choice(EDUCATIONS),
        "height_cm": random.randint(155, 198),
        "drinking": random.choice(DRINKING_OPTIONS),
        "smoking": random.choice(SMOKING_OPTIONS),
        "exercise": random.choice(EXERCISE_OPTIONS),
        "relationship_goal": random.choice(RELATIONSHIP_GOALS),
        "interests": random.sample(INTEREST_POOL, random.randint(3, 6)),
    }
    d.update(persona.get("details", {}))
    return d


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
    sb: Client, gender: str, keys: list[str], password: str, n: int, with_photos: bool, persona: dict
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
            "bio": make_bio(persona),
            "verification": random.choices(VERIFICATIONS, weights=VERIFICATION_WEIGHTS)[0],
            **make_details(persona),
        }
    ).execute()

    scores = scaled_scores(keys, persona["baseline"], persona["high"], persona["low"])
    weights = scaled_weights(
        keys, persona["priority_baseline"], persona["priority_high"], persona["priority_low"]
    )
    answers = likert_answers_from_scores(scores)

    sb.table("priority_weights").insert(
        [{"profile_id": uid, "quality_key": k, "weight": w} for k, w in weights.items()]
    ).execute()
    sb.table("quiz_scores").insert(
        [{"profile_id": uid, "quality_key": k, "score": s} for k, s in scores.items()]
    ).execute()
    sb.table("quiz_answers").insert(
        [{"profile_id": uid, "question_id": qid, "answer": a} for qid, a in answers.items()]
    ).execute()

    if with_photos:
        paths = upload_photos(sb, uid, gender)
        if paths:
            sb.table("profiles").update({"photos": paths}).eq("id", uid).execute()

    return {"email": email, "gender": gender, "name": first, "id": uid, "persona": persona["label"]}


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


def seed_users(sb: Client) -> list[tuple[str, str, int]]:
    """Return (profile_id, gender, n) for every @SEED_DOMAIN auth user,
    parsed from its deterministic genderN@ email (see create_person)."""
    out = []
    page = 1
    while True:
        result = sb.auth.admin.list_users(page=page, per_page=200)
        users = result if isinstance(result, list) else getattr(result, "users", [])
        if not users:
            break
        for u in users:
            email = u.email or ""
            if not email.endswith(f"@{SEED_DOMAIN}"):
                continue
            local = email.split("@", 1)[0]
            gender = next((g for g in GENDERS if local.startswith(g)), None)
            if gender is None:
                continue
            out.append((u.id, gender, int(local[len(gender):])))
        page += 1
    return out


def quiz_completeness(sb: Client, users: list[tuple[str, str, int]], keys: list[str]) -> None:
    """Print, per seed profile, how many of the 23 quiz_scores and 14
    quiz_answers rows it actually has."""
    for uid, gender, n in sorted(users, key=lambda u: (u[1], u[2])):
        n_scores = sb.table("quiz_scores").select("quality_key", count="exact").eq("profile_id", uid).execute().count
        n_answers = sb.table("quiz_answers").select("question_id", count="exact").eq("profile_id", uid).execute().count
        flag = "OK" if n_scores == len(keys) and n_answers == len(QUESTION_QUALITIES) else "INCOMPLETE"
        print(f"  {gender}{n:<7} scores {n_scores}/{len(keys)}  answers {n_answers}/{len(QUESTION_QUALITIES)}  [{flag}]")


def requiz(sb: Client, keys: list[str], users: list[tuple[str, str, int]]) -> int:
    """Wipe and regenerate quiz_scores/quiz_answers for every seed profile,
    re-deriving both fresh from that profile's original archetype.
    Leaves priority_weights, the profile row, and photos untouched.
    """
    for uid, gender, n in users:
        persona = PERSONAS[gender][(n - 1) % len(PERSONAS[gender])]
        sb.table("quiz_scores").delete().eq("profile_id", uid).execute()
        sb.table("quiz_answers").delete().eq("profile_id", uid).execute()

        scores = scaled_scores(keys, persona["baseline"], persona["high"], persona["low"])
        answers = likert_answers_from_scores(scores)

        sb.table("quiz_scores").insert(
            [{"profile_id": uid, "quality_key": k, "score": s} for k, s in scores.items()]
        ).execute()
        sb.table("quiz_answers").insert(
            [{"profile_id": uid, "question_id": qid, "answer": a} for qid, a in answers.items()]
        ).execute()
    return len(users)


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
    parser.add_argument(
        "--requiz", action="store_true",
        help="wipe and regenerate quiz_scores/quiz_answers for existing seed profiles, then exit "
             "(does not touch accounts, priority_weights, or photos)",
    )
    args = parser.parse_args()

    sb = client()
    with_photos = not args.no_photos
    keys = quality_keys(sb)

    if args.requiz:
        users = seed_users(sb)
        print(f"Found {len(users)} seed profile(s) under @{SEED_DOMAIN}.\n")
        print("Before:")
        quiz_completeness(sb, users, keys)
        requiz(sb, keys, users)
        print("\nAfter:")
        quiz_completeness(sb, users, keys)
        return

    if args.clean:
        print(f"Removing existing @{SEED_DOMAIN} accounts...")
        print(f"  deleted {clean(sb)} account(s).\n")
    counts = {"male": args.male, "female": args.female, "lgbtq": args.lgbtq}
    photo_note = "with demo photos" if with_photos else "no photos"
    total = sum(counts.values())
    print(f"Seeding {total} profiles {counts} ({photo_note}) against {len(keys)} qualities...\n")

    created = []
    for gender, count in counts.items():
        personas = PERSONAS[gender]
        for i in range(1, count + 1):
            persona = personas[(i - 1) % len(personas)]
            created.append(create_person(sb, gender, keys, args.password, i, with_photos, persona))

    for p in created:
        print(f"  {p['gender']:<7}  {p['name']:<12}  {p['email']:<24}  {p['persona']}")

    print(f"\nDone. {len(created)} profiles created. Shared password: {args.password}")


if __name__ == "__main__":
    main()
