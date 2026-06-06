"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, MessageCircle, SquarePen, User, type LucideIcon } from "lucide-react";

/** Fixed bottom navigation for the signed-in app. Discover is women-only. */
export function TabBar({ isWoman }: { isWoman: boolean }) {
  const pathname = usePathname();

  const tabs: { href: string; label: string; icon: LucideIcon }[] = [
    ...(isWoman ? [{ href: "/discover", label: "Discover", icon: Compass }] : []),
    { href: "/chats", label: "Chats", icon: MessageCircle },
    ...(isWoman ? [{ href: "/questions", label: "Questions", icon: SquarePen }] : []),
    { href: "/home", label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] border-t border-ink/[0.06] bg-cream/80 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <div className="flex items-stretch justify-around gap-1">
        {tabs.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[0.68rem] font-medium transition-colors ${
                active ? "text-plum" : "text-ink-soft/70"
              }`}
            >
              <span
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-plum/10" : "bg-transparent"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
