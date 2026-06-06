import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
      <header className="flex items-center gap-3 border-b border-ink/10 pb-3">
        <Link href="/chats" className="text-xl text-ink-soft" aria-label="Back to chats">
          ←
        </Link>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-plum/10 font-display text-plum">
          {thread.other.display_name.charAt(0)}
        </span>
        <div>
          <p className="font-medium leading-tight text-ink">{thread.other.display_name}</p>
          <p className="text-xs text-ink-soft">
            {thread.other.city ?? ""}
            {isWoman ? " · scanning for red flags" : ""}
          </p>
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
