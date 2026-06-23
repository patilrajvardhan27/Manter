import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin, ThumbsUp, TriangleAlert, MessageCircle, X } from "lucide-react";
import { getMyProfile } from "@/lib/profile";
import { getProfileDetail } from "@/lib/match";
import { VerifyBadge } from "@/components/VerifyBadge";
import { ProfileDetails } from "@/components/ProfileDetails";
import { ManDetailTabs } from "@/components/ManDetailTabs";
import { startConversation } from "../actions";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/gender");

  const person = await getProfileDetail(userId, id);
  if (!person) notFound();

  const profilePanel = (
    <div className="space-y-4">
      {person.bio ? (
        <section className="card-hover rounded-2xl bg-paper/60 p-3.5 shadow-[var(--shadow-soft)]">
          <h2 className="text-[0.68rem] font-semibold uppercase tracking-wider text-plum">About</h2>
          <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink-soft">{person.bio}</p>
        </section>
      ) : null}

      {person.strengths.length || person.gaps.length ? (
        <section className="card-hover rounded-2xl bg-paper/60 p-3.5 shadow-[var(--shadow-soft)]">
          {person.strengths.length ? (
            <div>
              <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-sage">
                <ThumbsUp size={13} strokeWidth={2.4} />
                Why they rank for you
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {person.strengths.map((s) => (
                  <span key={s} className="rounded-full bg-sage/15 px-2.5 py-1 text-[0.72rem] font-medium text-sage">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {person.gaps.length ? (
            <div className={person.strengths.length ? "mt-3" : ""}>
              <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-clay">
                <TriangleAlert size={13} strokeWidth={2.4} />
                Where they fall short
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {person.gaps.map((s) => (
                  <span key={s} className="rounded-full bg-clay/15 px-2.5 py-1 text-[0.72rem] font-medium text-clay">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <ProfileDetails details={person} />
    </div>
  );

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

      {person.photos.length ? (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          {person.photos.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`${person.display_name} photo ${i + 1}`}
              className="h-44 w-36 shrink-0 rounded-[var(--radius-card)] object-cover shadow-[var(--shadow-soft)] transition duration-300 hover:scale-[1.03] active:scale-[0.99]"
            />
          ))}
        </div>
      ) : null}

      {/* Score hero */}
      <section className="rise card-hover rounded-[var(--radius-card)] bg-paper/70 p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-[1.7rem] font-light leading-tight tracking-tight text-ink">
              {person.display_name}
              {person.age ? <span className="text-ink-soft">, {person.age}</span> : null}
            </h1>
            {person.city ? (
              <p className="flex items-center gap-1 text-sm text-ink-soft">
                <MapPin size={14} strokeWidth={2} />
                {person.city}
              </p>
            ) : null}
            <VerifyBadge status={person.verification} className="mt-1" />
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-4xl font-light leading-none text-plum">
              {person.score}
              <span className="text-lg text-ink-soft">%</span>
            </div>
            <p className="text-[0.65rem] uppercase tracking-wider text-ink-soft">match for you</p>
          </div>
        </div>
      </section>

      <ManDetailTabs profilePanel={profilePanel} answers={person.answers} qualities={person.qualities} />

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
          <form action={startConversation.bind(null, person.id)} className="flex-[1.4]">
            <button className="flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-plum text-sm font-semibold text-cream shadow-[var(--shadow-soft)] transition hover:bg-plum-deep active:scale-[0.98]">
              <MessageCircle size={17} strokeWidth={2.2} />
              {person.matchId ? "Open chat" : "Message " + person.display_name}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
