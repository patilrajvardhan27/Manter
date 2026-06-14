"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, X, Info, Sparkles, MapPin, PartyPopper } from "lucide-react";
import type { DiscoverMan } from "@/lib/match";
import { VerifyBadge } from "@/components/VerifyBadge";
import { startConversation } from "@/app/discover/actions";

const THRESHOLD = 110; // px past which a release commits the swipe

/**
 * Tinder-style deck: drag the top card (or use the buttons). Right commits a
 * "like" — find-or-create the match and open the chat (server action). Left
 * passes and reveals the next card. Tap the left/right edge of the photo to
 * step through a man's photos; tap the center (or the info badge) to open his
 * full profile. Built on pointer events, no deps.
 */
export function SwipeDeck({ men }: { men: DiscoverMan[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
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
      setPhotoIndex(0);
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

  function onPointerUp(e: React.PointerEvent) {
    if (!start.current) return;
    const { x, y } = drag;
    start.current = null;
    if (x > THRESHOLD && current) like(current);
    else if (x < -THRESHOLD) pass();
    else if (Math.abs(x) < 8 && Math.abs(y) < 8 && current && !busy) {
      // A tap (not a drag): the photo's left/right edges step through photos,
      // the info badge opens the profile, and the rest of the card does too.
      if ((e.target as HTMLElement).closest("[data-info-link]")) {
        router.push(`/discover/${current.id}`);
        return;
      }
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      if (current.photos.length > 1 && relX < 0.25) {
        setPhotoIndex((i) => Math.max(0, i - 1));
      } else if (current.photos.length > 1 && relX > 0.75) {
        setPhotoIndex((i) => Math.min(current.photos.length - 1, i + 1));
      } else {
        router.push(`/discover/${current.id}`);
      }
    } else setDrag({ x: 0, y: 0 }); // snap back
  }

  if (!current) {
    return (
      <div className="mt-10 rounded-[var(--radius-card)] bg-paper/70 p-8 text-center shadow-[var(--shadow-soft)]">
        <PartyPopper size={32} className="mx-auto text-plum" strokeWidth={1.8} />
        <p className="mt-3 font-display text-xl text-ink">You&apos;re all caught up.</p>
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
      <div className="relative h-[560px]">
        {next ? <Card man={next} className="scale-[0.96] opacity-70" /> : null}

        <Card
          man={current}
          photoIndex={photoIndex}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
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
          className="flex h-16 w-16 items-center justify-center rounded-full border border-ink/10 bg-paper text-redflag shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 hover:border-redflag/30 hover:shadow-lg active:scale-90 disabled:opacity-40"
        >
          <X size={26} strokeWidth={2.4} />
        </button>
        <button
          onClick={() => router.push(`/discover/${current.id}`)}
          disabled={busy}
          aria-label="View full profile & answers"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/10 bg-paper text-plum shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 hover:border-plum/30 hover:shadow-lg active:scale-90 disabled:opacity-40"
        >
          <Info size={20} strokeWidth={2.2} />
        </button>
        <button
          onClick={() => like(current)}
          disabled={busy}
          aria-label="Like and message"
          className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-plum text-cream shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 hover:bg-plum-deep hover:shadow-lg active:scale-90 disabled:opacity-40"
        >
          <Heart size={28} strokeWidth={2.2} fill="currentColor" />
        </button>
      </div>
      <p className="mt-3 text-center text-[0.7rem] text-ink-soft/70">
        Swipe right to message · left to pass · tap photo edges to browse, center for details
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
      className={`pointer-events-none absolute top-6 z-10 rounded-lg border-[3px] px-3 py-1 font-display text-2xl font-bold uppercase tracking-wide transition-transform duration-150 ${className}`}
      style={{
        ...style,
        transform: `scale(${0.85 + 0.15 * (Number(style?.opacity ?? 0))}) rotate(-6deg)`,
      }}
    >
      {children}
    </span>
  );
}

function Card({
  man,
  photoIndex = 0,
  children,
  className = "",
  style,
  ...handlers
}: {
  man: DiscoverMan;
  photoIndex?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  const photo = man.photos[photoIndex] ?? man.photos[0];

  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-[var(--radius-card)] bg-ink shadow-[var(--shadow-soft)] ${className}`}
      style={style}
      {...handlers}
    >
      {/* photo */}
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={man.display_name}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-plum/15">
          <Sparkles size={48} className="text-plum/40" strokeWidth={1.5} />
        </div>
      )}

      {/* photo progress dots */}
      {man.photos.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-3 top-3 flex gap-1.5">
          {man.photos.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i === photoIndex ? "bg-cream" : "bg-cream/30"
              }`}
            />
          ))}
        </div>
      ) : null}

      {/* match score badge */}
      <div className="pointer-events-none absolute right-3 top-7 flex flex-col items-center rounded-2xl bg-ink/35 px-3 py-2 backdrop-blur-sm">
        <Sparkles size={14} className="text-rose" strokeWidth={2.2} />
        <div className="font-display text-2xl font-light leading-tight text-cream">
          {man.score}
          <span className="text-sm text-cream/70">%</span>
        </div>
        <p className="text-[0.55rem] uppercase tracking-wider text-cream/70">match</p>
      </div>

      {/* bottom info overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/50 to-transparent px-5 pb-5 pt-24">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-medium text-cream">
              {man.display_name}
              {man.age ? <span className="text-cream/70">, {man.age}</span> : null}
            </h2>
            {man.city ? (
              <p className="flex items-center gap-1 text-sm text-cream/80">
                <MapPin size={13} strokeWidth={2} />
                {man.city}
              </p>
            ) : null}
            {man.bio ? <p className="mt-1 line-clamp-2 text-[0.85rem] leading-relaxed text-cream/75">{man.bio}</p> : null}
            <VerifyBadge status={man.verification} className="mt-1.5 brightness-0 invert" />
          </div>
          <span
            data-info-link
            aria-hidden
            className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream/15 text-cream backdrop-blur-sm transition active:scale-90"
          >
            <Info size={18} strokeWidth={2.2} />
          </span>
        </div>

        {man.top.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {man.top.map((t) => (
              <span
                key={t}
                className="rounded-full bg-cream/15 px-2.5 py-1 text-[0.72rem] font-medium text-cream backdrop-blur-sm"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}
