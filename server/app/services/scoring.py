"""Compatibility scoring engine.

compatibility = Σ weight[q] * man_score[q]  /  (Σ weight[q] * 5) * 100

man_score[q] blends the man's quiz self-assessment with community ratings,
down-weighting self-report as real ratings accumulate (Bayesian shrinkage):

    w_community = n / (n + K)        # K = prior strength
    man_score   = w_community * community_avg + (1 - w_community) * quiz_score
"""

from dataclasses import dataclass

COMMUNITY_PRIOR_K = 5  # ratings needed before community ~= self-report weight


@dataclass
class QualityInput:
    quality_key: str
    weight: int          # woman's priority, 1..5
    quiz_score: float    # man's self-assessment, 1..5
    community_avg: float  # avg of women's ratings, 1..5 (0 if none)
    community_n: int      # number of community ratings


def blended_man_score(q: QualityInput) -> float:
    if q.community_n <= 0:
        return q.quiz_score
    w = q.community_n / (q.community_n + COMMUNITY_PRIOR_K)
    return w * q.community_avg + (1 - w) * q.quiz_score


def compatibility(inputs: list[QualityInput]) -> dict:
    weighted = [(q, q.weight, blended_man_score(q)) for q in inputs if q.weight > 0]
    if not weighted:
        return {"score": 0, "breakdown": [], "strengths": [], "gaps": []}

    numerator = sum(w * s for _, w, s in weighted)
    denominator = sum(w * 5 for _, w, _ in weighted)
    score = round(numerator / denominator * 100)

    breakdown = [
        {
            "quality_key": q.quality_key,
            "weight": w,
            "man_score": round(s, 2),
            "contribution": round(w * s, 2),
        }
        for q, w, s in weighted
    ]
    ranked = sorted(breakdown, key=lambda b: b["contribution"], reverse=True)

    # "why you're seeing him": top contributors among high-priority qualities
    strengths = [b["quality_key"] for b in ranked[:3]]
    gaps = [
        b["quality_key"]
        for b in sorted(weighted_low(weighted), key=lambda b: b["gap"], reverse=True)[:3]
    ]
    return {"score": score, "breakdown": ranked, "strengths": strengths, "gaps": gaps}


def weighted_low(weighted) -> list[dict]:
    """Qualities she cares about most where his score lags (largest weight*deficit)."""
    return [
        {"quality_key": q.quality_key, "gap": w * (5 - s)}
        for q, w, s in weighted
    ]
