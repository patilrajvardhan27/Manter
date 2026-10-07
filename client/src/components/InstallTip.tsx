"use client";

import { useEffect, useState } from "react";
import { MoreVertical, Share, SquarePlus, Check, type LucideIcon } from "lucide-react";

const SEEN_KEY = "charms:install-tip-seen";
const FADE_MS = 500;

type Platform = "ios" | "android";

const STEPS: Record<Platform, { icon: LucideIcon; text: string }[]> = {
  ios: [
    { icon: Share, text: "Tap the Share button in your browser's toolbar." },
    { icon: SquarePlus, text: "Scroll down and tap “Add to Home Screen”." },
    { icon: Check, text: "Tap “Add”. Charms now opens from your home screen." },
  ],
  android: [
    { icon: MoreVertical, text: "Tap the three-dot menu at the top right of Chrome." },
    { icon: SquarePlus, text: "Tap “Add to Home screen” (or “Install app”)." },
    { icon: Check, text: "Tap “Add”. Charms now opens from your home screen." },
  ],
};

function detectPlatform(): Platform | null {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so check for touch as well
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return null;
}

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * One-time tip showing how to pin Charms to the phone's home screen.
 * Fades in over the page on mobile browsers, and never shows again once
 * dismissed or once the app is running as an installed PWA.
 */
export function InstallTip() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    if (!p || isInstalled()) return;
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
    } catch {
      // storage blocked (private mode): still show the tip, it just won't be remembered
    }
    setPlatform(p);
    // mount transparent first so the opacity transition has something to fade from
    const id = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setVisible(false);
    window.setTimeout(() => setPlatform(null), FADE_MS);
  }

  if (!platform) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-tip-title"
      onClick={dismiss}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      className={`fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm transition-opacity ease-out motion-reduce:transition-none ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ transitionDuration: `${FADE_MS}ms` }}
        className={`w-full max-w-[448px] rounded-[var(--radius-card)] border border-ink bg-cream p-6 shadow-[var(--shadow-soft)] transition-transform ease-out motion-reduce:transition-none ${
          visible ? "translate-y-0" : "translate-y-3"
        }`}
      >
        <p className="font-script text-xl text-brand">a quick tip</p>
        <h2 id="install-tip-title" className="mt-0.5 font-display text-[1.6rem] leading-tight tracking-tight text-ink">
          Keep Charms on your <span className="hl">home screen</span>.
        </h2>
        <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
          It opens full screen like an app, with nothing to download.
        </p>

        <ol className="mt-4 space-y-3">
          {STEPS[platform].map((s, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper text-ink">
                <s.icon size={18} strokeWidth={2.2} />
              </span>
              <span className="text-[0.95rem] leading-snug text-ink">
                <span className="font-semibold">{i + 1}.</span> {s.text}
              </span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={dismiss}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-full border border-ink bg-sun text-base font-semibold text-ink shadow-[var(--shadow-soft)] transition hover:bg-sun-deep active:scale-[0.98]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
