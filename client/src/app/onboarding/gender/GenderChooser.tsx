"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import type { Gender } from "@/lib/profile";

const GENDERS: { value: Gender; title: string; body: string; accent: string }[] = [
  {
    value: "female",
    title: "Female",
    body: "Set what character qualities matter to you, see explained matches, and use the safety suite.",
    accent: "var(--color-plum)",
  },
  {
    value: "male",
    title: "Male",
    body: "Take the character quiz, build a verified score, and be seen for who you are.",
    accent: "var(--color-sage)",
  },
  {
    value: "lgbtq",
    title: "LGBTQ+",
    body: "Same quiz, same verified score, same safety suite — built for you too.",
    accent: "var(--color-clay)",
  },
];

const INTERESTS: { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "lgbtq", label: "LGBTQ+" },
];

export function GenderChooser() {
  const router = useRouter();
  const [gender, setGender] = useState<Gender | null>(null);
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);

  function toggleInterest(g: Gender) {
    setInterestedIn((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  }

  function continueToProfile() {
    if (!gender) return;
    const params = new URLSearchParams({ gender });
    if (interestedIn.length) params.set("interestedIn", interestedIn.join(","));
    router.push(`/onboarding/profile?${params.toString()}`);
  }

  if (!gender) {
    return (
      <AuthShell
        eyebrow="Step 1 of 3"
        title="Who's signing up?"
        subtitle="This shapes your profile and can't be changed later, so pick the one that's you."
      >
        <div className="space-y-3">
          {GENDERS.map((g) => (
            <button
              key={g.value}
              onClick={() => setGender(g.value)}
              className="group w-full rounded-[var(--radius-card)] border border-ink/10 bg-paper/60 p-5 text-left shadow-[var(--shadow-soft)] transition active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.accent }} />
                <h3 className="font-display text-xl font-medium text-ink">{g.title}</h3>
                <span className="ml-auto text-ink-soft transition group-active:translate-x-0.5">→</span>
              </div>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{g.body}</p>
            </button>
          ))}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Step 2 of 3"
      title="Who are you interested in?"
      subtitle="Pick as many as you like — leave it blank to see everyone in Discover."
    >
      <div className="space-y-3">
        {INTERESTS.map((i) => {
          const active = interestedIn.includes(i.value);
          return (
            <button
              key={i.value}
              type="button"
              onClick={() => toggleInterest(i.value)}
              aria-pressed={active}
              className={`w-full rounded-2xl border px-5 py-4 text-left text-base font-medium transition active:scale-[0.99] ${
                active
                  ? "border-plum bg-plum text-cream shadow-[var(--shadow-soft)]"
                  : "border-ink/10 bg-paper/60 text-ink"
              }`}
            >
              {i.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => setGender(null)}
          className="flex h-14 items-center justify-center rounded-2xl border border-plum/20 px-5 text-base font-medium text-plum-deep transition active:scale-[0.98]"
        >
          Back
        </button>
        <button
          onClick={continueToProfile}
          className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-plum text-base font-semibold text-cream shadow-[var(--shadow-soft)] transition hover:bg-plum-deep active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    </AuthShell>
  );
}
