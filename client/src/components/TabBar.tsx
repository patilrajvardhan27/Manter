"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Fixed bottom navigation for the signed-in app. Discover is women-only. */
export function TabBar({ isWoman }: { isWoman: boolean }) {
  const pathname = usePathname();

  const tabs = [
    ...(isWoman ? [{ href: "/discover", label: "Discover", icon: "✦" }] : []),
    { href: "/chats", label: "Chats", icon: "✉" },
    { href: "/home", label: "Profile", icon: "☺" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] border-t border-ink/10 bg-cream/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="flex items-stretch justify-around">
        {tabs.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[0.7rem] font-medium transition ${
                active ? "text-plum" : "text-ink-soft"
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
