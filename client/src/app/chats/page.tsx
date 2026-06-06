import Link from "next/link";
import { redirect } from "next/navigation";
import { MessagesSquare, ChevronRight } from "lucide-react";
import { getMyProfile } from "@/lib/profile";
import { getConversations } from "@/lib/match";
import { TabBar } from "@/components/TabBar";

export default async function ChatsPage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/role");

  const isWoman = profile.role === "woman";
  const conversations = await getConversations(userId);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-28 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="rise" style={{ animationDelay: "0ms" }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-plum">Chats</p>
        <h1 className="mt-1 font-display text-[2rem] font-light leading-tight tracking-tight text-ink">
          Your conversations
        </h1>
      </header>

      <section className="mt-8 space-y-3">
        {conversations.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-paper/70 p-8 text-center shadow-[var(--shadow-soft)]">
            <MessagesSquare size={30} className="mx-auto text-plum/70" strokeWidth={1.8} />
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              No conversations yet.{" "}
              {isWoman ? (
                <Link href="/discover" className="font-medium text-plum underline-offset-4 hover:underline">
                  Find someone in Discover.
                </Link>
              ) : (
                "When a woman starts a conversation with you, it'll show up here."
              )}
            </p>
          </div>
        ) : null}

        {conversations.map((c, i) => (
          <Link
            key={c.matchId}
            href={`/chats/${c.matchId}`}
            className="rise flex items-center gap-3 rounded-[var(--radius-card)] bg-paper/70 p-4 shadow-[var(--shadow-soft)] transition active:scale-[0.99]"
            style={{ animationDelay: `${60 + i * 50}ms` }}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-plum/10 font-display text-lg text-plum">
              {c.other.display_name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{c.other.display_name}</p>
              <p className="truncate text-sm text-ink-soft">
                {c.last ? c.last.body : "No messages yet — say hi."}
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-ink-soft/40" strokeWidth={2} />
          </Link>
        ))}
      </section>

      <TabBar isWoman={isWoman} />
    </main>
  );
}
