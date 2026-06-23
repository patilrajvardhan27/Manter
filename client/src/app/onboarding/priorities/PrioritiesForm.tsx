"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { saveWeights } from "@/app/home/actions";
import {
  QUALITIES,
  QUALITY_GROUPS,
  type QualityGroup,
} from "@/lib/constants/qualities";

const DEFAULT_WEIGHT = 3;
const TIERS = ["", "Optional", "Minor", "Matters", "Important", "Essential"];

/**
 * Last onboarding step, same for every gender: rate how much each of the 23
 * qualities matters in a partner. Defaults to neutral (3); she/he/they can
 * adjust any of them later from their profile's Priorities tab.
 */
export function PrioritiesForm() {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const q of QUALITIES) map[q.key] = DEFAULT_WEIGHT;
    return map;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set(key: string, weight: number) {
    setValues((v) => ({ ...v, [key]: weight }));
    setError(null);
  }

  function finish() {
    startTransition(async () => {
      const res = await saveWeights(QUALITIES.map((q) => ({ quality_key: q.key, weight: values[q.key] })));
      if (res.ok) {
        router.replace("/home");
        router.refresh();
      } else {
        setError(res.error ?? "Could not save.");
      }
    });
  }

  const groups = useMemo(() => {
    const map = new Map<QualityGroup, typeof QUALITIES>();
    for (const q of QUALITIES) {
      const bucket = map.get(q.group) ?? [];
      bucket.push(q);
      map.set(q.group, bucket);
    }
    return [...map.entries()];
  }, []);

  return (
    <AuthShell
      eyebrow="Step 3 of 3"
      title="What matters to you?"
      subtitle="Rate how much each quality matters in a partner — this shapes who you see in Discover. You can change any of this later."
    >
      <div className="space-y-4 pb-2">
        {groups.map(([group, items]) => {
          const color = QUALITY_GROUPS[group].color;
          return (
            <section key={group} className="rounded-[var(--radius-card)] bg-paper/70 p-5 shadow-[var(--shadow-soft)]">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {QUALITY_GROUPS[group].label}
              </h2>
              <ul className="mt-3.5 space-y-4">
                {items.map((q) => {
                  const value = values[q.key];
                  return (
                    <li key={q.key}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[0.9rem] font-medium leading-tight text-ink">{q.label}</span>
                        <span
                          className="shrink-0 text-[0.72rem] font-semibold"
                          style={{ color: value >= 4 ? color : "var(--color-ink-soft)" }}
                        >
                          {TIERS[value]}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => {
                          const on = n <= value;
                          const current = n === value;
                          return (
                            <button
                              key={n}
                              type="button"
                              aria-label={`${q.label}: ${n} (${TIERS[n]})`}
                              aria-pressed={current}
                              onClick={() => set(q.key, n)}
                              className={`h-8 flex-1 rounded-lg text-[0.72rem] font-semibold transition-all duration-200 hover:scale-[1.04] active:scale-95 ${
                                current ? "scale-[1.08] ring-2 ring-offset-1 ring-offset-paper" : ""
                              }`}
                              style={{
                                backgroundColor: on ? color : "color-mix(in srgb, var(--color-ink) 6%, transparent)",
                                color: on ? "var(--color-cream)" : "var(--color-ink-soft)",
                                ["--tw-ring-color" as string]: color,
                              }}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {error ? <p className="rounded-xl bg-redflag/10 px-4 py-2.5 text-sm text-redflag">{error}</p> : null}

        <button
          type="button"
          onClick={finish}
          disabled={pending}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-plum px-6 py-3.5 text-base font-semibold text-cream shadow-[var(--shadow-soft)] transition active:scale-[0.99] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Finish setup"}
        </button>
      </div>
    </AuthShell>
  );
}
