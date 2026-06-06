import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { TabBar } from "@/components/TabBar";

const VERIFICATION_LABEL: Record<string, string> = {
  unverified: "Not verified yet",
  pending: "Verification pending",
  verified: "Verified",
  rejected: "Verification rejected",
};

export default async function HomePage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/role");

  const isWoman = profile.role === "woman";
  const nextStep = isWoman
    ? {
        title: "Discover your matches",
        body: "See men ranked by the 23 qualities that matter to you, and start a conversation.",
        href: "/discover",
        cta: "Open Discover",
      }
    : {
        title: "Your conversations",
        body: "When a woman starts a conversation with you, it lands here.",
        href: "/chats",
        cta: "Open Chats",
      };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-28 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between rise" style={{ animationDelay: "0ms" }}>
        <span className="font-display text-2xl font-semibold tracking-tight text-plum-deep">
          Manter
        </span>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm font-medium text-ink-soft underline-offset-4 hover:text-plum"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-12 rise" style={{ animationDelay: "120ms" }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-plum">
          You&apos;re in
        </p>
        <h1 className="mt-2 font-display text-[2.2rem] font-light leading-tight tracking-tight text-ink">
          Welcome, {profile.display_name}.
        </h1>
        <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-soft">
          Your account is set up as{" "}
          <strong className="text-ink">{profile.role === "woman" ? "a woman" : "a man"}</strong>
          {profile.city ? ` in ${profile.city}` : ""}.
        </p>
      </section>

      <section
        className="mt-8 rounded-[var(--radius-card)] bg-paper/70 p-6 shadow-[var(--shadow-soft)] rise"
        style={{ animationDelay: "200ms" }}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-medium text-ink">Your profile</h2>
          <span className="text-xs font-medium text-gold">
            {VERIFICATION_LABEL[profile.verification]}
          </span>
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Name</dt>
            <dd className="font-medium text-ink">{profile.display_name}</dd>
          </div>
          {profile.age ? (
            <div className="flex justify-between">
              <dt className="text-ink-soft">Age</dt>
              <dd className="font-medium text-ink">{profile.age}</dd>
            </div>
          ) : null}
          {profile.bio ? (
            <div>
              <dt className="text-ink-soft">Bio</dt>
              <dd className="mt-1 leading-relaxed text-ink">{profile.bio}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <Link
        href={nextStep.href}
        className="mt-4 block rounded-[var(--radius-card)] border border-plum/15 p-6 transition active:scale-[0.99] rise"
        style={{ animationDelay: "280ms" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Next step
        </p>
        <h2 className="mt-2 font-display text-xl font-medium text-ink">{nextStep.title}</h2>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{nextStep.body}</p>
        <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-plum px-4 py-1.5 text-xs font-semibold text-cream">
          {nextStep.cta} →
        </span>
      </Link>

      <TabBar isWoman={isWoman} />
    </main>
  );
}
