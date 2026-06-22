import { QUALITY_BY_KEY, QUALITY_GROUPS, type QualityGroup } from "@/lib/constants/qualities";
import type { QualityScore } from "@/lib/quiz-data";

/**
 * Grouped per-quality score bars with Claude's reason for low/high scores.
 * Shared between a man's own profile and anyone else viewing his profile.
 */
export function QualityScoreBreakdown({ scores }: { scores: QualityScore[] }) {
  const groups = new Map<QualityGroup, QualityScore[]>();
  for (const s of scores) {
    const g = QUALITY_BY_KEY[s.key]?.group;
    if (!g) continue;
    const bucket = groups.get(g) ?? [];
    bucket.push(s);
    groups.set(g, bucket);
  }

  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([group, items]) => (
        <div
          key={group}
          className="card-hover rounded-[var(--radius-card)] bg-paper/70 p-5 shadow-[var(--shadow-soft)]"
        >
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: QUALITY_GROUPS[group].color }}
          >
            {QUALITY_GROUPS[group].label}
          </h3>
          <ul className="mt-3 space-y-3">
            {items.map((s, i) => (
              <li key={s.key}>
                <div className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-[0.85rem] leading-tight text-ink">
                    {s.label}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-plum/10">
                    <span
                      className="bar-fill block h-full rounded-full"
                      style={{
                        "--bar-w": `${(s.score / 5) * 100}%`,
                        animationDelay: `${i * 60}ms`,
                        backgroundColor: QUALITY_GROUPS[group].color,
                      } as React.CSSProperties}
                    />
                  </span>
                  <span className="w-7 shrink-0 text-right text-[0.8rem] font-medium tabular-nums text-ink-soft">
                    {s.score.toFixed(1)}
                  </span>
                </div>
                {s.reason ? (
                  <p
                    className={`mt-1.5 pl-1 text-[0.78rem] leading-snug ${
                      s.score <= 2.5 ? "text-clay" : "text-ink-soft"
                    }`}
                  >
                    {s.score <= 2.5 ? "What pulled this down: " : "What affected this: "}
                    {s.reason}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
