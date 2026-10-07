"""Known-style matchmaker core. Pure functions, no I/O, fully unit-tested.

Three ideas, in the order they run:

1. Reciprocal scoring. A one-way score (how well B fits what A wants) ranks
   people A likes but who may never like A back. Dating is two-sided, so a
   pair is scored by the harmonic mean of both directions (RECON, Pizzato et
   al. 2010). The harmonic mean punishes lopsided pairs: 0.9 and 0.3 give
   0.45, not 0.6.

2. One introduction per person per round. Ranking each user's top candidate
   independently sends the same few desirable people to everyone (73 intros
   on one person in the eval). Known introduces one person at a time, which
   makes each round a matching problem on a general graph (LGBTQ+ users make
   it non-bipartite). Two solvers are here: greedy (best remaining pair
   first) and Edmonds' blossom max-weight matching. Blossom is optimal for the
   sum of edge weights, but in scripts/eval_matchmaker.py it produced no more
   mutual matches than greedy and reached fewer people, so greedy ships.

3. Revealed preferences. What people say they want is a weak predictor of
   who they end up liking (Eastwick & Finkel 2008). Each user's stated
   weights get a learned offset from their own outcomes (interested/pass on
   intros, "would meet again" after a match), fit with ridge regression that
   shrinks toward zero, so stated weights win until there is real evidence.
   Honest status: in simulation this showed no measurable gain, because even
   perfect knowledge of true preferences only adds about 1 match per 100
   users there. It's bounded, capped, and off-switchable (LEARN_OFFSETS=false),
   and it's the only part that can capture a stated-vs-revealed gap larger
   than the sim assumes. Validate it with an online A/B before trusting it.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import networkx as nx
import numpy as np

from app.services.qualities import KEYS

NEUTRAL = 3.0
INTEREST_BONUS = 0.05  # max bonus from shared interests, on a 0..1 scale
TOP_K_EDGES = 100  # candidate edges kept per person; 30 cut eval coverage from 96% to 81%
# Blossom only: edge weight = (score/100) ** SHARPNESS. With raw scores the
# sum objective breaks up strong pairs to pad coverage, and the odds of a
# mutual yes climb much faster than linearly in score. Replace with a fitted
# P(mutual yes | pair) once real outcome data exists.
SHARPNESS = 8.0
OFFSET_CAP = 2.0  # learned offset can move a weight by at most this much
RIDGE_LAMBDA = 2.0  # roughly "two pseudo-examples" of shrinkage toward stated
OFFSET_SCALE = 4.0  # ridge coefficients are in P(yes)/trait-point; map to weight units
MIN_EXAMPLES = 3

# Goals that make a first date pointless if one person holds each.
_LONG = {"Long-term relationship", "Marriage"}
_SHORT = {"Short-term"}


@dataclass(frozen=True)
class Person:
    id: str
    gender: str
    interested_in: frozenset[str]  # empty means open to everyone
    traits: dict[str, float]  # fused character score 1..5 per quality
    weights: dict[str, float]  # stated priority 1..5 per quality
    offsets: dict[str, float] = field(default_factory=dict)  # learned deltas
    relationship_goal: str | None = None
    smoking: str | None = None
    drinking: str | None = None
    interests: frozenset[str] = frozenset()
    # (field, value) pairs a partner must not have, e.g. ("smoking", "Yes")
    dealbreakers: frozenset[tuple[str, str]] = frozenset()


@dataclass(frozen=True)
class Introduction:
    a_id: str
    b_id: str
    score: float  # 0..100, reciprocal
    reasons_a: list[str]  # quality keys: why b is a fit for a
    reasons_b: list[str]  # quality keys: why a is a fit for b


# ---------------------------------------------------------------------------
# Vectorized pieces
# ---------------------------------------------------------------------------


def trait_matrix(people: list[Person]) -> np.ndarray:
    return np.array([[p.traits.get(k, NEUTRAL) for k in KEYS] for p in people], dtype=float)


def weight_matrix(people: list[Person]) -> np.ndarray:
    """Effective weights: stated + learned offset, clamped to [0, 5]."""
    return np.array(
        [[min(5.0, max(0.0, p.weights.get(k, NEUTRAL) + p.offsets.get(k, 0.0))) for k in KEYS] for p in people],
        dtype=float,
    )


def fit_matrix(W: np.ndarray, T: np.ndarray) -> np.ndarray:
    """F[i, j] = how well j's traits meet i's weights, in [0, 1].

    Traits are rescaled from 1..5 to 0..1 so a candidate who scores 1 on
    everything gets 0, not the 20% floor the old Σw·s / Σw·5 formula had.
    """
    t01 = (T - 1.0) / 4.0
    denom = W.sum(axis=1, keepdims=True)
    denom[denom == 0] = 1.0
    return (W @ t01.T) / denom


def harmonic(F: np.ndarray) -> np.ndarray:
    """H[i, j] = harmonic mean of F[i, j] and F[j, i]. Symmetric."""
    Ft = F.T
    s = F + Ft
    with np.errstate(divide="ignore", invalid="ignore"):
        H = np.where(s > 0, 2.0 * F * Ft / s, 0.0)
    return H


def jaccard(a: frozenset[str], b: frozenset[str]) -> float:
    if not a or not b:
        return 0.0
    a2, b2 = {x.lower() for x in a}, {x.lower() for x in b}
    return len(a2 & b2) / len(a2 | b2)


# ---------------------------------------------------------------------------
# Hard filters
# ---------------------------------------------------------------------------


def wants(viewer: Person, other: Person) -> bool:
    return not viewer.interested_in or other.gender in viewer.interested_in


def goals_compatible(a: Person, b: Person) -> bool:
    ga, gb = a.relationship_goal, b.relationship_goal
    if not ga or not gb:
        return True
    return not ((ga in _LONG and gb in _SHORT) or (ga in _SHORT and gb in _LONG))


def breaks_dealbreaker(viewer: Person, other: Person) -> bool:
    return any(getattr(other, f, None) == v for f, v in viewer.dealbreakers)


def eligible_pair(a: Person, b: Person) -> bool:
    return (
        a.id != b.id
        and wants(a, b)
        and wants(b, a)
        and goals_compatible(a, b)
        and not breaks_dealbreaker(a, b)
        and not breaks_dealbreaker(b, a)
    )


# ---------------------------------------------------------------------------
# Scoring + explanation
# ---------------------------------------------------------------------------


def reasons(weights_row: np.ndarray, traits_row: np.ndarray, n: int = 3) -> list[str]:
    """The viewer's highest-weighted qualities where the candidate is strong."""
    contrib = weights_row * (traits_row - 1.0)
    order = np.argsort(-contrib, kind="stable")
    return [KEYS[k] for k in order if traits_row[k] >= 3.5 and weights_row[k] > 0][:n]


def eligibility_mask(people: list[Person]) -> np.ndarray:
    """E[i, j] is True when i and j may be introduced. Vectorized; the
    per-pair functions above are the readable spec and are tested to agree."""
    n = len(people)
    genders = sorted({p.gender for p in people} | {g for p in people for g in p.interested_in})
    gi = {g: k for k, g in enumerate(genders)}
    g = np.array([gi[p.gender] for p in people])
    open_to = np.zeros((n, len(genders)), dtype=bool)
    for i, p in enumerate(people):
        if p.interested_in:
            open_to[i, [gi[x] for x in p.interested_in]] = True
        else:
            open_to[i, :] = True
    wants_m = open_to[:, g]  # wants_m[i, j]: i is open to j's gender
    E = wants_m & wants_m.T

    goal = np.array([p.relationship_goal or "" for p in people])
    long_ = np.isin(goal, list(_LONG))
    short = np.isin(goal, list(_SHORT))
    E &= ~((long_[:, None] & short[None, :]) | (short[:, None] & long_[None, :]))

    values = {f: np.array([getattr(p, f) or "" for p in people]) for f in ("smoking", "drinking", "relationship_goal")}
    for i, p in enumerate(people):
        for f, v in p.dealbreakers:
            if f in values:
                hit = values[f] == v
                E[i, hit] = False
                E[hit, i] = False

    np.fill_diagonal(E, False)
    return E


def interest_jaccard(people: list[Person]) -> np.ndarray:
    vocab: dict[str, int] = {}
    rows = [{vocab.setdefault(x.lower(), len(vocab)) for x in p.interests} for p in people]
    B = np.zeros((len(people), max(1, len(vocab))))
    for i, r in enumerate(rows):
        B[i, list(r)] = 1.0
    inter = B @ B.T
    size = B.sum(axis=1)
    union = size[:, None] + size[None, :] - inter
    with np.errstate(divide="ignore", invalid="ignore"):
        return np.where(union > 0, inter / union, 0.0)


def score_pairs(people: list[Person]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return (S, W, T). S[i, j] is the 0..100 reciprocal score, NaN if ineligible."""
    T = trait_matrix(people)
    W = weight_matrix(people)
    H = harmonic(fit_matrix(W, T))
    S = 100.0 * np.minimum(1.0, H + INTEREST_BONUS * interest_jaccard(people))
    S[~eligibility_mask(people)] = np.nan
    return S, W, T


def candidate_edges(
    S: np.ndarray, ids: list[str], excluded_pairs: set[frozenset[str]], min_score: float, top_k: int
) -> list[tuple[float, int, int]]:
    """Each person's top_k eligible, never-introduced pairs at or above min_score.

    Bounds the graph to O(n * top_k) edges. Too small a cap strands less
    desirable people, whose top options all get taken by others: in the eval,
    top_k=30 reached 81% of users and top_k=100 reached 96.5% with the same
    number of matches.
    """
    edges: dict[tuple[int, int], float] = {}
    for i in range(len(ids)):
        row = S[i]
        kept = 0
        for j in np.argsort(-np.nan_to_num(row, nan=-1.0), kind="stable"):
            j = int(j)
            if np.isnan(row[j]) or row[j] < min_score:
                break
            if frozenset((ids[i], ids[j])) in excluded_pairs:
                continue
            edges[(min(i, j), max(i, j))] = float(row[j])
            kept += 1
            if kept >= top_k:
                break
    return [(s, i, j) for (i, j), s in edges.items()]


def _greedy(edges: list[tuple[float, int, int]], ids: list[str]) -> list[tuple[int, int]]:
    taken: set[int] = set()
    out = []
    # Highest score first; ties broken by ids so runs are reproducible.
    for _, i, j in sorted(edges, key=lambda e: (-e[0], ids[e[1]], ids[e[2]])):
        if i not in taken and j not in taken:
            out.append((i, j))
            taken |= {i, j}
    return out


def _blossom(edges: list[tuple[float, int, int]], sharpness: float) -> list[tuple[int, int]]:
    G = nx.Graph()
    G.add_weighted_edges_from((i, j, (s / 100.0) ** sharpness) for s, i, j in edges)
    return [tuple(e) for e in nx.max_weight_matching(G, maxcardinality=False)]


def choose_introductions(
    people: list[Person],
    excluded_pairs: set[frozenset[str]] | None = None,
    min_score: float = 60.0,
    top_k: int = TOP_K_EDGES,
    method: str = "greedy",
    sharpness: float = SHARPNESS,
) -> list[Introduction]:
    """Pick at most one introduction per person this round.

    Pairs below `min_score` are dropped: an empty week beats a bad intro.
    `method` is "greedy" (default) or "blossom"; see the module docstring.
    """
    excluded_pairs = excluded_pairs or set()
    if len(people) < 2:
        return []
    S, W, T = score_pairs(people)
    ids = [p.id for p in people]
    edges = candidate_edges(S, ids, excluded_pairs, min_score, top_k)
    if method == "greedy":
        pairs = _greedy(edges, ids)
    elif method == "blossom":
        pairs = _blossom(edges, sharpness)
    else:
        raise ValueError(f"unknown method {method!r}")

    intros = []
    for i, j in pairs:
        a, b = (i, j) if ids[i] < ids[j] else (j, i)
        intros.append(
            Introduction(
                a_id=ids[a],
                b_id=ids[b],
                score=round(float(S[a, b]), 1),
                reasons_a=reasons(W[a], T[b]),
                reasons_b=reasons(W[b], T[a]),
            )
        )
    return sorted(intros, key=lambda x: (-x.score, x.a_id))


# ---------------------------------------------------------------------------
# Learning from outcomes
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Outcome:
    candidate_traits: dict[str, float]
    liked: bool
    weight: float = 1.0  # intro responses are noisier than post-date feedback


def learn_offsets(
    outcomes: list[Outcome],
    population_mean: dict[str, float],
    lam: float = RIDGE_LAMBDA,
    scale: float = OFFSET_SCALE,
    cap: float = OFFSET_CAP,
) -> dict[str, float]:
    """Ridge regression of liked/passed on the candidate's centered traits.

    Solves (XᵀAX + λI)β = XᵀA(y − ȳ) and maps β to weight units. If every
    outcome has the same label there is nothing to learn (y − ȳ = 0), which
    falls out of the math rather than needing a special case. Recomputed from
    scratch each round, so it is idempotent and can't drift or double count.
    """
    if len(outcomes) < MIN_EXAMPLES:
        return {}
    mu = np.array([population_mean.get(k, NEUTRAL) for k in KEYS])
    X = np.array([[o.candidate_traits.get(k, NEUTRAL) for k in KEYS] for o in outcomes]) - mu
    y = np.array([1.0 if o.liked else 0.0 for o in outcomes])
    a = np.array([o.weight for o in outcomes])
    yc = y - np.average(y, weights=a)
    XtA = X.T * a
    beta = np.linalg.solve(XtA @ X + lam * np.eye(len(KEYS)), XtA @ yc)
    delta = np.clip(scale * beta, -cap, cap)
    return {k: round(float(d), 2) for k, d in zip(KEYS, delta) if abs(d) >= 0.05}
