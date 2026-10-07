import itertools
import random

import numpy as np
import pytest

from app.services.matchmaker import (
    Outcome,
    Person,
    choose_introductions,
    eligibility_mask,
    eligible_pair,
    fit_matrix,
    harmonic,
    learn_offsets,
    score_pairs,
)
from app.services.qualities import KEYS


def person(pid, gender="female", into=(), traits=None, weights=None, **kw):
    return Person(
        id=pid,
        gender=gender,
        interested_in=frozenset(into),
        traits=traits or {},
        weights=weights or {},
        **kw,
    )


def uniform(v):
    return {k: v for k in KEYS}


# --- scoring -------------------------------------------------------------


def test_fit_is_zero_for_all_ones_and_one_for_all_fives():
    W = np.ones((2, len(KEYS)))
    T = np.vstack([np.ones(len(KEYS)), np.full(len(KEYS), 5.0)])
    F = fit_matrix(W, T)
    assert F[0, 0] == pytest.approx(0.0)
    assert F[0, 1] == pytest.approx(1.0)


def test_harmonic_punishes_lopsided_pairs():
    F = np.array([[0.0, 0.9], [0.3, 0.0]])
    H = harmonic(F)
    assert H[0, 1] == pytest.approx(0.45)
    assert H[0, 1] == H[1, 0]
    assert H[0, 1] < (0.9 + 0.3) / 2


def test_reciprocal_score_drops_when_the_other_side_wouldnt_choose_you():
    # A wants humour and B has it; B wants ambition and A lacks it.
    a = person("a", "female", ["male"], traits={"ambitious": 1}, weights={"sense_of_humour": 5})
    b = person("b", "male", ["female"], traits={"sense_of_humour": 5}, weights={"ambitious": 5})
    c = person("c", "female", ["male"], traits={"ambitious": 5}, weights={"sense_of_humour": 5})
    S, _, _ = score_pairs([a, b, c])
    assert S[2, 1] > S[0, 1]


# --- hard filters --------------------------------------------------------


def test_mutual_interest_required():
    a = person("a", "female", ["male"])
    b = person("b", "male", ["male"])
    assert not eligible_pair(a, b)


def test_empty_interested_in_means_open_to_everyone():
    assert eligible_pair(person("a", "lgbtq"), person("b", "male"))


def test_short_term_vs_long_term_blocked_but_figuring_it_out_is_fine():
    a = person("a", relationship_goal="Marriage")
    b = person("b", relationship_goal="Short-term")
    c = person("c", relationship_goal="Still figuring it out")
    assert not eligible_pair(a, b)
    assert eligible_pair(a, c) and eligible_pair(b, c)


def test_dealbreaker_is_symmetric_in_effect():
    a = person("a", dealbreakers=frozenset({("smoking", "Yes")}))
    b = person("b", smoking="Yes")
    assert not eligible_pair(a, b) and not eligible_pair(b, a)


def test_vectorized_mask_agrees_with_readable_spec():
    rng = random.Random(7)
    genders = ["male", "female", "lgbtq"]
    goals = [None, "Marriage", "Short-term", "Long-term relationship", "Still figuring it out"]
    people = [
        person(
            f"p{i}",
            rng.choice(genders),
            rng.sample(genders, rng.randint(0, 2)),
            relationship_goal=rng.choice(goals),
            smoking=rng.choice([None, "No", "Yes"]),
            dealbreakers=frozenset({("smoking", "Yes")}) if rng.random() < 0.3 else frozenset(),
        )
        for i in range(40)
    ]
    E = eligibility_mask(people)
    for i, j in itertools.product(range(40), repeat=2):
        assert E[i, j] == eligible_pair(people[i], people[j]), (i, j)


# --- matching ------------------------------------------------------------


def test_one_intro_per_person_and_no_repeats():
    rng = random.Random(1)
    people = [
        person(f"p{i:02d}", "lgbtq", [], traits={k: rng.uniform(2, 5) for k in KEYS}, weights=uniform(3))
        for i in range(25)
    ]
    first = choose_introductions(people, min_score=0)
    seen = [x for i in first for x in (i.a_id, i.b_id)]
    assert len(seen) == len(set(seen)), "someone got two intros in one round"
    assert len(first) == 12  # 25 people, everyone mutually eligible: 12 pairs

    excluded = {frozenset((i.a_id, i.b_id)) for i in first}
    second = choose_introductions(people, excluded_pairs=excluded, min_score=0)
    assert not ({frozenset((i.a_id, i.b_id)) for i in second} & excluded)


def _path_graph():
    # Path a - b - c - d. b-c is the single best pair (100), a-b and c-d ~86.
    a = person("a", traits=uniform(4), weights=uniform(3))
    b = person("b", traits=uniform(5), weights=uniform(3))
    c = person("c", traits=uniform(5), weights=uniform(3))
    d = person("d", traits=uniform(4), weights=uniform(3))
    off_path = {frozenset(p) for p in [("a", "c"), ("a", "d"), ("b", "d")]}
    return [a, b, c, d], off_path


def test_greedy_takes_the_best_pair_first():
    people, off_path = _path_graph()
    intros = choose_introductions(people, excluded_pairs=off_path, min_score=0)
    assert [frozenset((i.a_id, i.b_id)) for i in intros] == [frozenset("bc")]


def test_blossom_finds_the_global_optimum_greedy_misses():
    # The textbook case where greedy loses: blossom pairs a-b and c-d.
    # (On realistic populations the eval shows this rarely matters.)
    people, off_path = _path_graph()
    intros = choose_introductions(people, excluded_pairs=off_path, min_score=0, method="blossom", sharpness=1)
    assert {frozenset((i.a_id, i.b_id)) for i in intros} == {frozenset("ab"), frozenset("cd")}


@pytest.mark.parametrize("method", ["greedy", "blossom"])
def test_both_solvers_respect_one_intro_per_person(method):
    rng = random.Random(5)
    people = [
        person(f"p{i:02d}", rng.choice(["male", "female"]), [], traits={k: rng.uniform(2, 5) for k in KEYS}, weights=uniform(3))
        for i in range(30)
    ]
    seen = [x for i in choose_introductions(people, min_score=0, method=method) for x in (i.a_id, i.b_id)]
    assert len(seen) == len(set(seen))


def test_unknown_method_raises():
    people, _ = _path_graph()
    with pytest.raises(ValueError):
        choose_introductions(people, method="hungarian")


def test_min_score_leaves_people_unmatched_rather_than_bad_intros():
    a = person("a", traits=uniform(1.5), weights=uniform(3))
    b = person("b", traits=uniform(1.5), weights=uniform(3))
    assert choose_introductions([a, b], min_score=60) == []


def test_non_bipartite_graph_works():
    # Three LGBTQ+ users all open to each other form a triangle; a bipartite
    # matcher can't represent this. Exactly one pair should come out.
    people = [person(n, "lgbtq", ["lgbtq"], traits=uniform(4), weights=uniform(3)) for n in "abc"]
    assert len(choose_introductions(people, min_score=0)) == 1
    assert len(choose_introductions(people, min_score=0, method="blossom")) == 1


def test_reasons_point_at_the_viewers_priorities():
    a = person("a", traits=uniform(4), weights={**uniform(1), "sense_of_humour": 5})
    b = person("b", traits={**uniform(3), "sense_of_humour": 5}, weights=uniform(3))
    (intro,) = choose_introductions([a, b], min_score=0)
    assert intro.reasons_a[0] == "sense_of_humour"


# --- learning ------------------------------------------------------------


def test_learns_a_preference_the_user_never_stated():
    rng = random.Random(3)
    mean = uniform(3)
    outcomes = []
    for _ in range(12):
        t = {k: rng.uniform(2, 4) for k in KEYS}
        t["sense_of_humour"] = rng.choice([1.5, 4.8])
        outcomes.append(Outcome(t, liked=t["sense_of_humour"] > 3))
    off = learn_offsets(outcomes, mean)
    assert off["sense_of_humour"] == max(off.values())
    assert off["sense_of_humour"] > 1.0


def test_no_signal_means_no_offsets():
    outcomes = [Outcome(uniform(4), liked=True) for _ in range(5)]
    assert learn_offsets(outcomes, uniform(3)) == {}


def test_too_few_examples_means_no_offsets():
    assert learn_offsets([Outcome(uniform(5), True), Outcome(uniform(1), False)], uniform(3)) == {}


def test_offsets_are_capped():
    outcomes = [Outcome({**uniform(3), "reliable": 5}, True), Outcome({**uniform(3), "reliable": 1}, False)] * 40
    off = learn_offsets(outcomes, uniform(3))
    assert all(abs(v) <= 2.0 for v in off.values())
