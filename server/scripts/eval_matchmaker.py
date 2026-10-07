"""Offline eval: does each matchmaker design choice actually help?

A simulated population with hidden ground truth, run through the real code in
app/services/matchmaker.py. No database, no network.

Ground truth per person:
  * true traits      1..5 per quality, with a person-level "desirability" shift
  * true preferences what they actually respond to
  * selectivity      the share of the eligible pool they'd say yes to
  * chemistry        pair-specific noise no trait can see (Joel et al. 2017
                     found this is most of the variance in real attraction)

What the matchmaker sees instead:
  * observed traits  true traits + measurement noise (quiz / interview)
  * stated weights   true preferences + noise, rounded to 1..5
                     (people only roughly know what they want)

Policies compared, one round each. Every policy except `uncapped` gives each
person at most one intro, which is the real product constraint:
  uncapped     everyone gets their own top pick by one-way fit (old Discover);
               infeasible here, shown only to measure congestion
  random       random valid matching (floor)
  first-come   one-way fit, users served in arrival order
  greedy       reciprocal score, best remaining pair first (ships)
  blossom p=k  reciprocal score, max-weight matching with edge weight
               (score/100)**k; p=1 is the raw sum

Then two diagnostics:
  headroom  how much better greedy does when handed the ground truth it can't
            see (true weights, then true traits too). This bounds what any
            preference learner or better measurement could possibly add.
  learning  several rounds of greedy, with and without learned offsets.

    python scripts/eval_matchmaker.py
    python scripts/eval_matchmaker.py --n 400 --seeds 10 --rounds 8
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import replace
from pathlib import Path

import networkx as nx
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.matchmaker import (  # noqa: E402
    Outcome,
    Person,
    choose_introductions,
    eligibility_mask,
    fit_matrix,
    harmonic,
    learn_offsets,
    trait_matrix,
    weight_matrix,
)
from app.services.qualities import KEYS  # noqa: E402

K = len(KEYS)
BIASED = ["sense_of_humour", "vibe_match", "notices_small_things"]


class World:
    def __init__(
        self,
        n: int,
        rng: np.random.Generator,
        obs_noise: float,
        stated_noise: float,
        chemistry: float,
        bias: float = 0.0,
    ):
        self.n = n
        genders = rng.choice(["male", "female", "lgbtq"], size=n, p=[0.42, 0.42, 0.16])
        into = []
        for g in genders:
            if rng.random() < 0.15:
                into.append(frozenset())  # open to everyone
            else:
                into.append(frozenset({"male": ["female"], "female": ["male"], "lgbtq": ["lgbtq"]}[g]))

        desirability = rng.normal(0, 0.45, size=(n, 1))
        self.true_traits = np.clip(3.4 + desirability + rng.normal(0, 0.7, size=(n, K)), 1, 5)
        # True preferences: a few qualities matter a lot, most matter a little.
        self.true_w = rng.gamma(0.6, 1.0, size=(n, K))
        self.true_w = 5 * self.true_w / self.true_w.max(axis=1, keepdims=True)
        stated = self.true_w + rng.normal(0, stated_noise, size=(n, K))
        # Systematic gap between stated and revealed preference (Eastwick &
        # Finkel 2008): everyone underweights a few qualities when asked.
        for k in BIASED:
            stated[:, KEYS.index(k)] -= bias
        stated = np.clip(np.rint(stated), 1, 5)
        observed = np.clip(self.true_traits + rng.normal(0, obs_noise, size=(n, K)), 1, 5)

        self.people = [
            Person(
                id=f"u{i:04d}",
                gender=str(genders[i]),
                interested_in=into[i],
                traits=dict(zip(KEYS, observed[i])),
                weights=dict(zip(KEYS, stated[i])),
            )
            for i in range(n)
        ]
        self.index = {p.id: i for i, p in enumerate(self.people)}
        self.E = eligibility_mask(self.people)

        # True utility of j to i, plus pair chemistry; i says yes above their threshold.
        t01 = (self.true_traits - 1) / 4
        U = (self.true_w @ t01.T) / self.true_w.sum(axis=1, keepdims=True)
        U += rng.normal(0, chemistry, size=(n, n))
        selectivity = rng.uniform(0.55, 0.85, size=n)  # quantile of eligible pool they reject
        self.yes = np.zeros((n, n), dtype=bool)
        for i in range(n):
            pool = U[i, self.E[i]]
            if pool.size:
                self.yes[i] = U[i] > np.quantile(pool, selectivity[i])
        self.yes &= self.E
        self.mutual = self.yes & self.yes.T

    def score_intros(self, pairs: list[tuple[int, int]]) -> dict[str, float]:
        if not pairs:
            return {"intros": 0, "mutual_rate": 0.0, "mutual_per_100": 0.0, "max_load": 0, "coverage": 0.0}
        load = np.zeros(self.n, dtype=int)
        mutual = set()
        for i, j in pairs:
            load[i] += 1
            load[j] += 1
            if self.mutual[i, j]:
                mutual.add(frozenset((i, j)))
        return {
            "intros": len(pairs),
            "mutual_rate": sum(self.mutual[i, j] for i, j in pairs) / len(pairs),
            "mutual_per_100": 100 * len(mutual) / self.n,
            "max_load": int(load.max()),
            "coverage": float((load > 0).mean()),
        }


def policy_random(w: World, rng: np.random.Generator) -> list[tuple[int, int]]:
    G = nx.Graph()
    ii, jj = np.where(np.triu(w.E, 1))
    G.add_weighted_edges_from((int(i), int(j), rng.random()) for i, j in zip(ii, jj))
    return [tuple(e) for e in nx.max_weight_matching(G)]


def _scores(w: World, reciprocal: bool) -> np.ndarray:
    F = fit_matrix(weight_matrix(w.people), trait_matrix(w.people))
    S = harmonic(F) if reciprocal else F
    return np.where(w.E, S, -np.inf)


def policy_uncapped(w: World) -> list[tuple[int, int]]:
    """Old Discover: everyone gets their own top pick. Infeasible for a
    one-intro-at-a-time product; shown to measure congestion."""
    S = _scores(w, reciprocal=False)
    return [(i, int(np.argmax(S[i]))) for i in range(w.n) if np.isfinite(S[i]).any()]


def policy_first_come(w: World, rng: np.random.Generator) -> list[tuple[int, int]]:
    """One-way fit, one intro per person, users served in arrival order."""
    S = _scores(w, reciprocal=False)
    free = np.ones(w.n, dtype=bool)
    pairs = []
    for i in rng.permutation(w.n):
        if not free[i]:
            continue
        row = np.where(free, S[i], -np.inf)
        row[i] = -np.inf
        if np.isfinite(row).any():
            j = int(np.argmax(row))
            pairs.append((int(i), j))
            free[i] = free[j] = False
    return pairs


def policy_matched(w: World, people=None, excluded=None, min_score=0.0, method="greedy", sharpness=8.0):
    intros = choose_introductions(
        people or w.people, excluded_pairs=excluded, min_score=min_score, method=method, sharpness=sharpness
    )
    return [(w.index[x.a_id], w.index[x.b_id]) for x in intros]


def one_round(args) -> dict[str, list[dict[str, float]]]:
    names = ["uncapped", "random", "first-come", "greedy", "blossom p=1", "blossom p=8"]
    results: dict[str, list[dict[str, float]]] = {k: [] for k in names}
    for seed in range(args.seeds):
        rng = np.random.default_rng(seed)
        w = World(args.n, rng, args.obs_noise, args.stated_noise, args.chemistry, args.bias)
        results["uncapped"].append(w.score_intros(policy_uncapped(w)))
        results["random"].append(w.score_intros(policy_random(w, rng)))
        results["first-come"].append(w.score_intros(policy_first_come(w, rng)))
        results["greedy"].append(w.score_intros(policy_matched(w)))
        for pw in (1, 8):
            results[f"blossom p={pw}"].append(w.score_intros(policy_matched(w, method="blossom", sharpness=pw)))
    return results


def headroom(args) -> dict[str, list[dict[str, float]]]:
    rows: dict[str, list[dict[str, float]]] = {
        "no preferences (uniform weights)": [],
        "stated weights, observed traits": [],
        "true weights, observed traits": [],
        "true weights, true traits": [],
    }
    for seed in range(args.seeds):
        w = World(args.n, np.random.default_rng(seed), args.obs_noise, args.stated_noise, args.chemistry, args.bias)
        uniform = [replace(p, weights={k: 3.0 for k in KEYS}) for p in w.people]
        true_w = [replace(p, weights=dict(zip(KEYS, w.true_w[i]))) for i, p in enumerate(w.people)]
        true_wt = [replace(p, traits=dict(zip(KEYS, w.true_traits[i]))) for i, p in enumerate(true_w)]
        for name, people in zip(rows, (uniform, w.people, true_w, true_wt)):
            rows[name].append(w.score_intros(policy_matched(w, people)))
    return rows


def learning(args) -> dict[str, np.ndarray]:
    curves = {"stated only": [], "stated + learned": []}
    for seed in range(args.seeds):
        for arm in curves:
            rng = np.random.default_rng(1000 + seed)
            w = World(args.n, rng, args.obs_noise, args.stated_noise, args.chemistry, args.bias)
            observed = trait_matrix(w.people)
            pop_mean = dict(zip(KEYS, observed.mean(axis=0)))
            people = list(w.people)
            history: dict[int, list[Outcome]] = {i: [] for i in range(w.n)}
            excluded: set[frozenset[str]] = set()
            rates = []
            for _ in range(args.rounds):
                pairs = policy_matched(w, people, excluded)
                rates.append(np.mean([w.mutual[i, j] for i, j in pairs]) if pairs else 0.0)
                for i, j in pairs:
                    excluded.add(frozenset((w.people[i].id, w.people[j].id)))
                    history[i].append(Outcome(w.people[j].traits, bool(w.yes[i, j]), 0.5))
                    history[j].append(Outcome(w.people[i].traits, bool(w.yes[j, i]), 0.5))
                if arm == "stated + learned":
                    people = [replace(p, offsets=learn_offsets(history[i], pop_mean)) for i, p in enumerate(w.people)]
            curves[arm].append(rates)
    return {k: np.array(v) for k, v in curves.items()}


def fmt(rows: list[dict[str, float]], key: str, pct: bool = False) -> str:
    v = np.array([r[key] for r in rows], dtype=float)
    if pct:
        return f"{100 * v.mean():5.1f}% ± {100 * v.std():4.1f}"
    return f"{v.mean():6.1f} ± {v.std():4.1f}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=300)
    ap.add_argument("--seeds", type=int, default=8)
    ap.add_argument("--rounds", type=int, default=6)
    ap.add_argument("--obs-noise", type=float, default=0.5)
    ap.add_argument("--stated-noise", type=float, default=1.5)
    ap.add_argument("--chemistry", type=float, default=0.06)
    ap.add_argument("--bias", type=float, default=0.0, help="how much everyone underweights 3 qualities when asked")
    ap.add_argument("--skip-learning", action="store_true")
    args = ap.parse_args()

    print(f"n={args.n} users, {args.seeds} seeds, bias={args.bias}, mean ± std across seeds\n")
    r = one_round(args)
    print(f"{'policy':<13} {'mutual yes':>16} {'matches/100 users':>19} {'most intros on 1 person':>25} {'users reached':>16}")
    for name, rows in r.items():
        print(
            f"{name:<13} {fmt(rows, 'mutual_rate', pct=True):>16} {fmt(rows, 'mutual_per_100'):>19} "
            f"{fmt(rows, 'max_load'):>25} {fmt(rows, 'coverage', pct=True):>16}"
        )

    print("\nHeadroom: greedy given ground truth it normally can't see")
    for name, rows in headroom(args).items():
        print(f"  {name:<34} matches/100 {fmt(rows, 'mutual_per_100')}   mutual yes {fmt(rows, 'mutual_rate', pct=True)}")

    if args.skip_learning:
        return
    print(f"\nLearning loop, mutual-yes rate per round ({args.rounds} rounds of greedy):")
    curves = learning(args)
    print("round        " + "".join(f"{i + 1:>8}" for i in range(args.rounds)))
    for name, c in curves.items():
        print(f"{name:<13}" + "".join(f"{100 * m:7.1f}%" for m in c.mean(axis=0)))
    gain = curves["stated + learned"][:, -3:].mean(axis=1) - curves["stated only"][:, -3:].mean(axis=1)
    print(f"\nlast 3 rounds, learned minus stated: {100 * gain.mean():+.1f} pts (std {100 * gain.std():.1f}, {args.seeds} seeds)")


if __name__ == "__main__":
    main()
