"use client";

import { useRef, useState } from "react";
import type { DiscoverMan } from "@/lib/match";
import { startConversation } from "@/app/discover/actions";

const VERIFIED_BADGE: Record<string, { label: string; cls: string }> = {
  verified: { label: "✓ Verified", cls: "text-sage" },
  pending: { label: "Verification pending", cls: "text-gold" },
  rejected: { label: "Unverified", cls: "text-ink-soft" },
  unverified: { label: "Not verified", cls: "text-ink-soft" },
};

const THRESHOLD = 110; // px past which a release commits the swipe

/**
 * Tinder-style deck: drag the top card (or use the buttons). Right commits a
 * "like" — find-or-create the match and open the chat (server action). Left
 * passes and reveals the next card. Built on pointer events, no deps.
 */
export function SwipeDeck({ men }: { men: DiscoverMan[] }) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [flyOut, setFlyOut] = useState<"left" | "right" | null>(null);
  const [busy, setBusy] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const current = men[index];
  const next = men[index + 1];

  function pass() {
    if (busy) return;
    setFlyOut("left");
    setBusy(true);
    setTimeout(() => {
      setIndex((i) => i + 1);
      setDrag({ x: 0, y: 0 });
      setFlyOut(null);
      setBusy(false);
    }, 280);
  }

  async function like(man: DiscoverMan) {
    if (busy) return;
    setBusy(true);
    setFlyOut("right");
    // Let the card fly, then hand off to the server action (it redirects to chat).
    setTimeout(() => startConversation(man.id), 240);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (busy) return;
    start.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  }

  function onPointerUp() {
    if (!start.current) return;
    const { x } = drag;
    start.current = null;
    if (x > THRESHOLD && current) like(current);
    else if (x < -THRESHOLD) pass();
    else setDrag({ x: 0, y: 0 }); // snap back
  }

  if (!current) {
    return (
      <div className="mt-10 rounded-[var(--radius-card)] bg-paper/70 p-8 text-center shadow-[var(--shadow-soft)]">
        <p className="font-display text-xl text-ink">You&apos;re all caught up.</p>
        <p className="mt-2 text-sm text-ink-soft">
          No more profiles for now. Check your chats, or come back later.
        </p>
      </div>
    );
  }

  // Top-card transform: follow the finger, with a gentle rotation + fly-out.
  const committed = flyOut
    ? { x: flyOut === "right" ? 600 : -600, rot: flyOut === "right" ? 24 : -24 }
    : { x: drag.x, rot: drag.x / 18 };
  const likeOpacity = Math.min(Math.max(drag.x / THRESHOLD, 0), 1);
  const passOpacity = Math.min(Math.max(-drag.x / THRESHOLD, 0), 1);

  return (
    <div className="mt-6 select-none">
      <div className="relative h-[440px]">
        {next ? <Card man={next} className="scale-[0.96] opacity-70" /> : null}

        <Card
          man={current}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          dragging={drag.x !== 0 && !flyOut}
          style={{
            transform: `translate(${committed.x}px, ${flyOut ? 0 : drag.y * 0.15}px) rotate(${committed.rot}deg)`,
            transition: flyOut || drag.x === 0 ? "transform 0.28s ease-out" : "none",
            cursor: "grab",
            touchAction: "pan-y",
          }}
        >
          <Stamp className="left-5 border-sage text-sage" style={{ opacity: likeOpacity }}>
            LIKE
          </Stamp>
          <Stamp className="right-5 border-redflag text-redflag" style={{ opacity: passOpacity }}>
            PASS
          </Stamp>
        </Card>
      </div>

      <div className="mt-5 flex items-center justify-center gap-5">
        <button
          onClick={pass}
          disabled={busy}
          aria-label="Pass"
          className="flex h-16 w-16 items-center justify-center rounded-full border border-ink/10 bg-paper text-2xl text-redflag shadow-[var(--shadow-soft)] transition active:scale-95 disabled:opacity-40"
        >
          ✕
        </button>
        <button
          onClick={() => like(current)}
          disabled={busy}
          aria-label="Like and message"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-plum text-2xl text-cream shadow-[var(--shadow-soft)] transition active:scale-95 disabled:opacity-40"
        >
          ♥
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-ink-soft">
        Swipe right to message · left to pass
      </p>
    </div>
  );
}

function Stamp({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`pointer-events-none absolute top-6 rounded-lg border-[3px] px-3 py-1 font-display text-2xl font-bold uppercase tracking-wide ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

function Card({
  man,
  children,
  className = "",
  style,
  dragging,
  ...handlers
}: {
  man: DiscoverMan;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  dragging?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  const badge = VERIFIED_BADGE[man.verification] ?? VERIFIED_BADGE.unverified;
  return (
    <div
      className={`absolute inset-0 flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-paper p-6 shadow-[var(--shadow-soft)] ${className}`}
      style={style}
      {...handlers}
    >
      {children}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-medium text-ink">
            {man.display_name}
            {man.age ? <span className="text-ink-soft">, {man.age}</span> : null}
          </h2>
          {man.city ? <p className="text-sm text-ink-soft">{man.city}</p> : null}
          <p className={`mt-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-4xl font-light leading-none text-plum">
            {man.score}
            <span className="text-lg text-ink-soft">%</span>
          </div>
          <p className="text-[0.65rem] uppercase tracking-wider text-ink-soft">match</p>
        </div>
      </div>

      {man.bio ? (
        <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">{man.bio}</p>
      ) : null}

      {man.top.length ? (
        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
          {man.top.map((t) => (
            <span
              key={t}
              className="rounded-full bg-plum/10 px-2.5 py-1 text-[0.72rem] font-medium text-plum"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
