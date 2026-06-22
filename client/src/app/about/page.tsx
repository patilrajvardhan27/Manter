import Link from "next/link";
import { Award, ShieldAlert, BadgeCheck, ArrowRight } from "lucide-react";
import { StaticPage, StaticSection } from "@/components/StaticPage";

export default function AboutPage() {
  return (
    <StaticPage
      eyebrow="About Charms"
      title="Date by character, not by photos."
      subtitle="Every major dating app surfaces men based on looks and proximity. Charms surfaces them based on whether they're actually good people — backed by data, not just a gut feeling."
    >
      <StaticSection title="The problem">
        <p>
          Women with high standards are stuck swiping through endless profiles
          with no real signal about whether someone is emotionally mature,
          respectful, or kind. That leaves a lot of trial and error — and a lot
          of room to get hurt.
        </p>
        <p>
          We built Charms for women who aren&apos;t anti-men — they&apos;re
          anti-<em className="not-italic font-medium text-ink">bad</em> men,
          and they want a faster, safer way to find the good ones.
        </p>
      </StaticSection>

      <StaticSection title="The 23-quality framework">
        <p>
          Instead of a bio and six photos, every man on Charms is scored across{" "}
          <strong className="font-medium text-ink">23 character qualities</strong>{" "}
          — things like respecting boundaries, emotional maturity, reliability,
          and how he treats women when no one&apos;s watching. These aren&apos;t
          arbitrary: they&apos;re drawn from real lists women wrote, mapped to
          what relationship research shows actually predicts a healthy
          relationship.
        </p>
        <p>
          A woman sets how much each quality matters to her. A man&apos;s score
          comes from a behavioral quiz — answered in his own words, and scored
          by AI rather than a multiple-choice form he can game.
        </p>
      </StaticSection>

      <StaticSection title="What makes this different">
        <div className="space-y-4">
          <Feature
            Icon={Award}
            color="var(--color-plum)"
            title="Character score, not a swipe deck"
            body="Matches are ranked by how well someone scores on the qualities she actually cares about."
          />
          <Feature
            Icon={ShieldAlert}
            color="var(--color-redflag)"
            title="AI red-flag scanning"
            body="Claude reads conversations for controlling language, guilt-trips, and love-bombing — and explains why each pattern matters."
          />
          <Feature
            Icon={BadgeCheck}
            color="var(--color-sage)"
            title="Verification, visibly"
            body="Profiles show a clear verification status, so you know who's been checked and who hasn't."
          />
        </div>
      </StaticSection>

      <StaticSection title="Our commitment">
        <p>
          Charms doesn&apos;t sell your data, and it doesn&apos;t run on ads.
          Our incentive is simple: help you find someone genuinely good, and
          keep you safe while you look. Read more in our{" "}
          <Link href="/safety" className="font-medium text-plum underline-offset-4 hover:underline">
            Safety Center
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-plum underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </StaticSection>

      <Link
        href="/register"
        className="group mt-2 flex h-14 items-center justify-center gap-2 rounded-2xl bg-plum text-base font-semibold text-cream shadow-[var(--shadow-soft)] transition hover:bg-plum-deep active:scale-[0.98]"
      >
        Create your account
        <ArrowRight size={18} strokeWidth={2.4} className="transition group-hover:translate-x-0.5" />
      </Link>
    </StaticPage>
  );
}

function Feature({
  Icon,
  color,
  title,
  body,
}: {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  color: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
      >
        <Icon size={17} strokeWidth={2} />
      </span>
      <div>
        <h3 className="font-display text-base font-medium text-ink">{title}</h3>
        <p className="mt-0.5 text-[0.9rem] leading-relaxed text-ink-soft">{body}</p>
      </div>
    </div>
  );
}
