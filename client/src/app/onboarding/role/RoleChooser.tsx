"use client";

import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import type { Role } from "@/lib/profile";

const ROLES: {
  role: Role;
  title: string;
  body: string;
  accent: string;
}[] = [
  {
    role: "woman",
    title: "I'm a woman",
    body: "Set what character qualities matter to you, see explained matches, and use the safety suite.",
    accent: "var(--color-plum)",
  },
  {
    role: "man",
    title: "I'm a man",
    body: "Take the behavioral quiz, build a verified character score, and be seen for who you are.",
    accent: "var(--color-sage)",
  },
];

export function RoleChooser() {
  const router = useRouter();

  return (
    <AuthShell
      eyebrow="Step 1 of 2"
      title="Who's signing up?"
      subtitle="This shapes your whole experience and can't be changed later, so pick the one that's you."
    >
      <div className="space-y-3">
        {ROLES.map((r) => (
          <button
            key={r.role}
            onClick={() => router.push(`/onboarding/profile?role=${r.role}`)}
            className="group w-full rounded-[var(--radius-card)] border border-ink/10 bg-paper/60 p-5 text-left shadow-[var(--shadow-soft)] transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: r.accent }}
              />
              <h3 className="font-display text-xl font-medium text-ink">{r.title}</h3>
              <span className="ml-auto text-ink-soft transition group-active:translate-x-0.5">
                →
              </span>
            </div>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{r.body}</p>
          </button>
        ))}
      </div>
    </AuthShell>
  );
}
