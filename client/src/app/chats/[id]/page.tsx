import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getMyProfile } from "@/lib/profile";
import { getThread } from "@/lib/match";
import { Chat } from "@/components/Chat";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/role");

  const thread = await getThread(id, userId);
  if (!thread) notFound();

  const isWoman = profile.role === "woman";

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-3 border-b border-ink/[0.06] pb-3">
        <Link
          href="/chats"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper"
          aria-label="Back to chats"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </Link>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-plum/10 font-display text-lg text-plum">
          {thread.other.display_name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="font-medium leading-tight text-ink">{thread.other.display_name}</p>
          {isWoman ? (
            <p className="flex items-center gap-1 text-xs text-sage">
              <ShieldCheck size={13} strokeWidth={2.2} />
              Red-flag scanning on
            </p>
          ) : thread.other.city ? (
            <p className="text-xs text-ink-soft">{thread.other.city}</p>
          ) : null}
        </div>
      </header>

      <Chat
        matchId={thread.matchId}
        meId={userId}
        isWoman={isWoman}
        otherName={thread.other.display_name}
        initial={thread.messages}
      />
    </main>
  );
}
