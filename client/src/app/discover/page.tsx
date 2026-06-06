import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { getDiscovery } from "@/lib/match";
import { TabBar } from "@/components/TabBar";
import { SwipeDeck } from "@/components/SwipeDeck";

export default async function DiscoverPage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/role");
  // Discovery is women-first; men go straight to their conversations.
  if (profile.role !== "woman") redirect("/chats");

  const men = await getDiscovery(userId);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-28 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="rise" style={{ animationDelay: "0ms" }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-plum">Discover</p>
        <h1 className="mt-1 font-display text-[2rem] font-light leading-tight tracking-tight text-ink">
          Ranked for you, {profile.display_name}.
        </h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
          Every score is built from the 23 qualities you weighted — not photos.
        </p>
      </header>

      {men.length === 0 ? (
        <p className="mt-8 rounded-[var(--radius-card)] bg-paper/70 p-6 text-sm text-ink-soft shadow-[var(--shadow-soft)]">
          No men to show yet. Seed some demo profiles and check back.
        </p>
      ) : (
        <SwipeDeck men={men} />
      )}

      <TabBar isWoman />
    </main>
  );
}
