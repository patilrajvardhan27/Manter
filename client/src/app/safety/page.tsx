import Link from "next/link";
import { Award, ShieldAlert, BadgeCheck, ImageOff, MessageCircleHeart, Phone } from "lucide-react";
import { StaticPage, StaticSection } from "@/components/StaticPage";

export default function SafetyPage() {
  return (
    <StaticPage
      eyebrow="Safety Center"
      title="How Manter keeps you safer."
      subtitle="Here's exactly how the scoring, scanning, and verification works — in plain language, no black box."
    >
      <StaticSection title="The character score">
        <p className="flex gap-3">
          <IconBadge Icon={Award} color="var(--color-plum)" />
          <span>
            Every man answers a behavioral quiz in his own words — situational
            questions, not multiple choice. Those answers are scored by AI
            (1–5) across <strong className="font-medium text-ink">23 character qualities</strong>,
            with a one-sentence reason for each score. You set how much each
            quality matters to you, and matches are ranked by how well someone
            fits <em className="not-italic">your</em> priorities — not a
            generic algorithm.
          </span>
        </p>
      </StaticSection>

      <StaticSection title="AI red-flag scanning">
        <p className="flex gap-3">
          <IconBadge Icon={ShieldAlert} color="var(--color-redflag)" />
          <span>
            Once you&apos;re chatting, incoming messages are scanned by Claude
            for patterns like controlling language, guilt-tripping, love-bombing,
            and other early warning signs — the kind of thing that&apos;s easy
            to miss in the moment but obvious in hindsight. When something
            flags, you&apos;ll see what it noticed and why it matters.
          </span>
        </p>
        <p className="rounded-[var(--radius-card)] bg-paper/70 p-4 text-sm">
          This is a second opinion, not a guarantee. Always trust your own
          judgment over any score or scan — if something feels off, it
          probably is.
        </p>
      </StaticSection>

      <StaticSection title="Verification badges">
        <p className="flex gap-3">
          <IconBadge Icon={BadgeCheck} color="var(--color-sage)" />
          <span>
            Profiles show one of four states:{" "}
            <strong className="font-medium text-ink">Verified</strong>,{" "}
            <strong className="font-medium text-ink">Pending</strong>,{" "}
            <strong className="font-medium text-ink">Not verified</strong>, or{" "}
            rejected. A verified badge means identity checks have been
            completed — look for it on a profile before you decide who to
            trust with more of your time.
          </span>
        </p>
      </StaticSection>

      <StaticSection title="Photo privacy">
        <p className="flex gap-3">
          <IconBadge Icon={ImageOff} color="var(--color-gold)" />
          <span>
            Your photos stay private by default. A man can only see them once
            you&apos;ve started a conversation with him — never before.
          </span>
        </p>
      </StaticSection>

      <StaticSection title="Before you meet in person">
        <ul className="list-disc space-y-2 pl-5">
          <li>Video call before meeting — voices and mannerisms are hard to fake.</li>
          <li>Meet for the first time in a public place, and get there yourself.</li>
          <li>Tell a friend who, where, and when — share your live location if you can.</li>
          <li>Keep your phone charged and accessible.</li>
          <li>Trust your instincts. It&apos;s always okay to leave.</li>
        </ul>
      </StaticSection>

      <StaticSection title="Something feel wrong?">
        <p className="flex gap-3">
          <IconBadge Icon={MessageCircleHeart} color="var(--color-clay)" />
          <span>
            If a conversation crosses a line or someone&apos;s behavior worries
            you, reach out to{" "}
            <a href="mailto:safety@manter.app" className="font-medium text-plum underline-offset-4 hover:underline">
              safety@manter.app
            </a>{" "}
            — every report is reviewed.
          </span>
        </p>
        <p className="flex gap-3">
          <IconBadge Icon={Phone} color="var(--color-redflag)" />
          <span>
            If you&apos;re ever in immediate danger, contact local emergency
            services first — Manter is a tool, not a substitute for that.
          </span>
        </p>
      </StaticSection>

      <p className="text-sm">
        Read more in our{" "}
        <Link href="/privacy" className="font-medium text-plum underline-offset-4 hover:underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="font-medium text-plum underline-offset-4 hover:underline">
          Terms of Service
        </Link>
        .
      </p>
    </StaticPage>
  );
}

function IconBadge({
  Icon,
  color,
}: {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  color: string;
}) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
    >
      <Icon size={17} strokeWidth={2} />
    </span>
  );
}
