import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin, ThumbsUp, TriangleAlert, MessageCircle, X } from "lucide-react";
import { getMyProfile } from "@/lib/profile";
import { getManDetail, type QualityDetail } from "@/lib/match";
import { QUALITY_GROUPS, type QualityGroup } from "@/lib/constants/qualities";
import { VerifyBadge } from "@/components/VerifyBadge";
import { ProfileDetails } from "@/components/ProfileDetails";
import { startConversation } from "../actions";

const GROUP_ORDER: QualityGroup[] = [
  "respect",
  "emotional-maturity",
  "safety",
  "partnership",
  "character",
];

/** Five dots, `value` of them filled (rounded). Used for his score + her weight. */
function Dots({ value, color }: { value: number; color: string }) {
  const filled = Math.round(value);
  return (
    <span className="inline-flex gap-0.5" aria-label={`${filled} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: n <= filled ? color : "color-mix(in srgb, var(--color-ink) 12%, transparent)" }}
        />
      ))}
    </span>
  );
}

export default async function ManDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/role");
  if (profile.role !== "woman") redirect("/chats");

  const man = await getManDetail(userId, id);
  if (!man) notFound();

  const byGroup = GROUP_ORDER.map((g) => ({
    group: g,
    meta: QUALITY_GROUPS[g],
    items: man.qualities.filter((q) => q.group === g),
  })).filter((s) => s.items.length > 0);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-2 pb-2">
        <Link
          href="/discover"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper"
          aria-label="Back to discover"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </Link>
        <span className="text-sm font-medium text-ink-soft">Profile</span>
      </header>

      {man.photos.length ? (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          {man.photos.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`${man.display_name} photo ${i + 1}`}
              className="h-56 w-44 shrink-0 rounded-[var(--radius-card)] object-cover shadow-[var(--shadow-soft)]"
            />
          ))}
        </div>
      ) : null}

      {/* Score hero */}
      <section className="rise rounded-[var(--radius-card)] bg-paper/70 p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[2rem] font-light leading-tight tracking-tight text-ink">
              {man.display_name}
              {man.age ? <span className="text-ink-soft">, {man.age}</span> : null}
            </h1>
            {man.city ? (
              <p className="flex items-center gap-1 text-sm text-ink-soft">
                <MapPin size={14} strokeWidth={2} />
                {man.city}
              </p>
            ) : null}
            <VerifyBadge status={man.verification} className="mt-1" />
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-5xl font-light leading-none text-plum">
              {man.score}
              <span className="text-xl text-ink-soft">%</span>
            </div>
            <p className="text-[0.65rem] uppercase tracking-wider text-ink-soft">match for you</p>
          </div>
        </div>

        {man.bio ? (
          <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">{man.bio}</p>
        ) : null}

        {man.strengths.length ? (
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sage">
              <ThumbsUp size={13} strokeWidth={2.4} />
              Why he ranks for you
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {man.strengths.map((s) => (
                <span key={s} className="rounded-full bg-sage/15 px-2.5 py-1 text-[0.72rem] font-medium text-sage">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {man.gaps.length ? (
          <div className="mt-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-clay">
              <TriangleAlert size={13} strokeWidth={2.4} />
              Where he falls short
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {man.gaps.map((s) => (
                <span key={s} className="rounded-full bg-clay/15 px-2.5 py-1 text-[0.72rem] font-medium text-clay">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div className="mt-4">
        <ProfileDetails details={man} />
      </div>

      {/* Per-quality answers */}
      <section className="mt-6">
        <h2 className="font-display text-xl font-medium text-ink">His answers, across the 23</h2>
        <p className="mt-1 text-sm text-ink-soft">
          His self-assessment <span className="text-plum">●</span> vs. how much you weighted it{" "}
          <span className="text-ink-soft">●</span>.
        </p>

        <div className="mt-4 space-y-6">
          {byGroup.map((sec) => (
            <div key={sec.group}>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: sec.meta.color }}
              >
                {sec.meta.label}
              </p>
              <div className="mt-2 space-y-2">
                {sec.items.map((q: QualityDetail) => (
                  <div
                    key={q.key}
                    className="rounded-2xl bg-paper/60 p-3.5 shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[0.92rem] font-medium text-ink">{q.label}</p>
                      <span className="shrink-0 font-display text-sm text-plum">
                        {q.manScore ? q.manScore.toFixed(1) : "—"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-4 text-[0.7rem] text-ink-soft">
                      <span className="flex items-center gap-1.5">
                        His score <Dots value={q.manScore} color="var(--color-plum)" />
                      </span>
                      <span className="flex items-center gap-1.5">
                        Your priority{" "}
                        <Dots value={q.weight} color="color-mix(in srgb, var(--color-ink) 45%, transparent)" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] border-t border-ink/10 bg-cream/90 px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href="/discover"
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-ink/10 bg-paper text-sm font-semibold text-ink-soft transition active:scale-[0.98]"
          >
            <X size={17} strokeWidth={2.4} />
            Pass
          </Link>
          <form action={startConversation.bind(null, man.id)} className="flex-[1.4]">
            <button className="flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-plum text-sm font-semibold text-cream shadow-[var(--shadow-soft)] transition hover:bg-plum-deep active:scale-[0.98]">
              <MessageCircle size={17} strokeWidth={2.2} />
              {man.matchId ? "Open chat" : "Message " + man.display_name}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
