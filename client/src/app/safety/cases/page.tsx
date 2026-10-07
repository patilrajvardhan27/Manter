import Link from "next/link";
import { StaticPage, StaticSection } from "@/components/StaticPage";

interface Case {
  title: string;
  where: string;
  what: string;
  outcome: string;
  lesson: string;
  source: { label: string; href: string };
}

/**
 * Real, court-decided cases that began on a dating app. Every entry ends in a
 * conviction and links to public reporting; nothing here is alleged or
 * ongoing. Keep it factual and free of graphic detail.
 */
const CASES: Case[] = [
  {
    title: "The Grace Millane case",
    where: "Auckland, New Zealand · 2018",
    what: "A 21-year-old British traveller went on a first date with a man she had matched with on Tinder, and went back to his hotel. She was killed that night.",
    outcome:
      "He was found guilty of murder in November 2019 and jailed for life with a minimum of 17 years. He was later convicted of offences against two other women, one of whom he had also met on Tinder months earlier.",
    lesson:
      "Keep a first date in a public place from start to finish. And report bad behaviour even when it feels minor: there were earlier victims.",
    source: { label: "CNN", href: "https://edition.cnn.com/2020/12/21/asia/grace-millane-killer-named-intl-hnk/index.html" },
  },
  {
    title: "The Stephen Port murders",
    where: "London, UK · 2014 to 2015",
    what: "Port met young men through dating apps, including Grindr, and invited them to his flat, where he drugged them. Four men died.",
    outcome:
      "He was convicted in November 2016 and given a whole-life sentence. A 2021 inquest jury found that police failings probably contributed to the later deaths.",
    lesson:
      "Never let a first meeting be at someone's home. Tell a friend exactly who you are meeting and where, so someone can connect the dots if you go quiet.",
    source: {
      label: "Gay Times",
      href: "https://www.gaytimes.com/life/police-failings-probably-contributed-to-deaths-of-grindr-killer-stephen-ports-victims-inquest-finds",
    },
  },
  {
    title: "The Sydney Loofe case",
    where: "Nebraska, USA · 2017",
    what: "A 24-year-old matched with a woman on Tinder. The match was bait: the woman and her boyfriend had planned to lure someone, and Sydney did not come home from their second date.",
    outcome:
      "Both were convicted of first-degree murder. He was sentenced to death and she was sentenced to life in prison in November 2021.",
    lesson:
      "The person in the profile may not be acting alone. Share your live location, and agree a check-in time with a friend who will act if you miss it.",
    source: { label: "Wikipedia", href: "https://en.wikipedia.org/wiki/Murder_of_Sydney_Loofe" },
  },
  {
    title: "The Jaipur Tinder case",
    where: "Jaipur, India · 2018",
    what: "A man who had presented himself on Tinder as a wealthy businessman was invited to his match's flat. He was held for ransom there and then killed.",
    outcome: "In November 2023 a Jaipur court sentenced three people to life imprisonment for the murder.",
    lesson:
      "Showing off money makes you a target, and a private flat is the wrong place for a first meeting, whoever suggests it.",
    source: { label: "The Quint", href: "https://www.thequint.com/news/crime/jaipur-woman-tinder-murder-life-imprisonment" },
  },
  {
    title: "The “Tinder Swindler”",
    where: "Across Europe · up to 2019",
    what: "A man posing as the heir to a diamond fortune dated women he met on Tinder, then said he was in danger and asked them for loans, which he never repaid.",
    outcome:
      "He was convicted of fraud in Israel in 2019 and sentenced to 15 months, of which he served five. His victims were left with the debts.",
    lesson:
      "Never lend or send money to someone you met online, however real the relationship feels and however urgent the story.",
    source: { label: "The Daily Aus", href: "https://www.thedailyaus.com.au/crime/the-tinder-swindler-has-been-arrested-in-georgia" },
  },
];

const linkClass = "font-medium text-brand underline-offset-4 hover:underline";

export default function SafetyCasesPage() {
  return (
    <StaticPage
      eyebrow="Safety Center"
      title="Real cases, real lessons."
      subtitle="Most people you meet online are who they say they are. These cases are here so the exceptions are easier to spot. In every one, the blame belongs to the offender alone."
    >
      <StaticSection title="The scale of it">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            In the US, people reported losing{" "}
            <strong className="font-medium text-ink">$1.14 billion</strong> to romance scams in 2023, across
            64,003 reports. The typical loss was $2,000 per person.
          </li>
          <li>
            The lie reported most often in 2022: a new partner needs money because someone is sick, hurt, or
            in jail. It came up in about a quarter of reports.
          </li>
          <li>
            These are only the reported cases. Many people never tell anyone, so the real numbers are higher.
          </li>
        </ul>
        <p className="text-xs">
          Sources:{" "}
          <a
            href="https://www.ftc.gov/news-events/data-visualizations/data-spotlight/2023/02"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            US Federal Trade Commission
          </a>
          ,{" "}
          <a
            href="https://www.nbcnewyork.com/news/business/money-report/romance-scams-cost-consumers-1-14-billion-last-year-its-a-more-insidious-fraud-expert-says/5564717/"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            NBC
          </a>
          .
        </p>
      </StaticSection>

      <StaticSection title="Cases that ended in convictions">
        <div className="space-y-4">
          {CASES.map((c) => (
            <article
              key={c.title}
              className="rounded-[var(--radius-card)] bg-paper/70 p-5 shadow-[var(--shadow-soft)]"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/80">{c.where}</p>
              <h3 className="mt-1 font-display text-base font-medium text-ink">{c.title}</h3>
              <p className="mt-2 text-[0.9rem] leading-relaxed">{c.what}</p>
              <p className="mt-2 text-[0.9rem] leading-relaxed">{c.outcome}</p>
              <p className="mt-3 rounded-xl bg-cream px-4 py-3 text-[0.9rem] leading-relaxed text-ink">
                <strong className="font-medium">What it teaches:</strong> {c.lesson}
              </p>
              <p className="mt-3 text-xs">
                Source:{" "}
                <a href={c.source.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {c.source.label}
                </a>
              </p>
            </article>
          ))}
        </div>
      </StaticSection>

      <StaticSection title="Warning signs these cases share">
        <ul className="list-disc space-y-2 pl-5">
          <li>Pushing to meet somewhere private, or to move to a private place early in the date.</li>
          <li>Any request for money, a loan, gift cards, or an investment.</li>
          <li>A story that is too impressive, or that changes when you ask questions.</li>
          <li>Refusing a video call before meeting.</li>
          <li>Pressure, guilt, or anger when you say no or slow things down.</li>
        </ul>
      </StaticSection>

      <StaticSection title="If something happens">
        <ul className="list-disc space-y-2 pl-5">
          <li>In immediate danger, call your local emergency number (112 in India, 911 in the US).</li>
          <li>
            Lost money to someone you met online? In India, call 1930 or report at cybercrime.gov.in. In the
            US, report at ReportFraud.ftc.gov. The sooner you report, the better the chance of stopping a
            transfer.
          </li>
          <li>
            Tell us too, at{" "}
            <a href="mailto:safety@charms.app" className={linkClass}>
              safety@charms.app
            </a>
            , so we can act on the account.
          </li>
        </ul>
      </StaticSection>

      <p className="text-sm">
        Back to the{" "}
        <Link href="/safety" className={linkClass}>
          Safety Center
        </Link>
        .
      </p>
    </StaticPage>
  );
}
