import { Briefcase, GraduationCap, Ruler, Heart, Wine, Cigarette, Dumbbell } from "lucide-react";

/** The optional "about you" fields shared by every profile surface. */
export interface ProfileDetailFields {
  profession: string | null;
  education: string | null;
  height_cm: number | null;
  drinking: string | null;
  smoking: string | null;
  exercise: string | null;
  relationship_goal: string | null;
  interests: string[];
}

/**
 * Renders the details card (profession, education, height, habits, goal) plus
 * interest chips. Returns null when there's nothing to show, so callers can drop
 * it in unconditionally. Presentational + server-safe (no client hooks).
 */
export function ProfileDetails({ details }: { details: ProfileDetailFields }) {
  const rows = [
    { icon: Briefcase, label: "Profession", value: details.profession },
    { icon: GraduationCap, label: "Education", value: details.education },
    { icon: Ruler, label: "Height", value: details.height_cm ? `${details.height_cm} cm` : null },
    { icon: Heart, label: "Looking for", value: details.relationship_goal },
    { icon: Wine, label: "Drinking", value: details.drinking },
    { icon: Cigarette, label: "Smoking", value: details.smoking },
    { icon: Dumbbell, label: "Exercise", value: details.exercise },
  ].filter((r) => r.value);

  if (!rows.length && !details.interests.length) return null;

  return (
    <section className="rounded-[var(--radius-card)] bg-paper/70 p-5 shadow-[var(--shadow-soft)]">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-plum">Details</h2>

      {rows.length ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.label} className="min-w-0">
                <dt className="flex items-center gap-1.5 text-[0.68rem] font-medium uppercase tracking-wide text-ink-soft/70">
                  <Icon size={13} strokeWidth={2} /> {r.label}
                </dt>
                <dd className="mt-0.5 truncate text-sm font-medium text-ink">{r.value}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      {details.interests.length ? (
        <div className="mt-4">
          <p className="text-[0.68rem] font-medium uppercase tracking-wide text-ink-soft/70">Interests</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {details.interests.map((it) => (
              <span
                key={it}
                className="rounded-full bg-plum/10 px-2.5 py-1 text-[0.72rem] font-medium text-plum"
              >
                {it}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
