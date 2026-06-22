import { StaticPage, StaticSection } from "@/components/StaticPage";

export default function PrivacyPage() {
  return (
    <StaticPage
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="Last updated: June 14, 2026. This explains what we collect, why, and how it's used — including how AI fits in."
    >
      <StaticSection title="1. What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-ink">Account info</strong> — email and authentication
            details, handled by Supabase Auth.
          </li>
          <li>
            <strong className="font-medium text-ink">Profile info</strong> — display name, age, city,
            bio, and up to 3 photos.
          </li>
          <li>
            <strong className="font-medium text-ink">Quiz responses</strong> — free-text answers to
            behavioral questions, and the quality weights you set.
          </li>
          <li>
            <strong className="font-medium text-ink">Messages</strong> — chat content between matched
            users, stored to provide the chat feature.
          </li>
        </ul>
      </StaticSection>

      <StaticSection title="2. How AI is used">
        <p>
          We use Anthropic&apos;s Claude models to:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Score behavioral quiz answers against the 23 character qualities.</li>
          <li>Scan incoming chat messages for red-flag language patterns (e.g. controlling
            or manipulative phrasing) and surface that to the recipient.</li>
        </ul>
        <p>
          Quiz answers and message content are sent to Anthropic&apos;s API for this
          processing. Anthropic does not use this data to train its models under our
          API agreement. We don&apos;t use AI processing for anything beyond scoring
          and red-flag detection.
        </p>
      </StaticSection>

      <StaticSection title="3. Who we share data with">
        <p>We don&apos;t sell your data. We use a small number of infrastructure providers to run the app:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="font-medium text-ink">Supabase</strong> — database, authentication, and photo storage.</li>
          <li><strong className="font-medium text-ink">Anthropic</strong> — AI scoring and red-flag detection (see above).</li>
          <li><strong className="font-medium text-ink">Vercel</strong> and <strong className="font-medium text-ink">Render</strong> — application hosting.</li>
        </ul>
        <p>Each of these providers processes data only as needed to provide their service to us.</p>
      </StaticSection>

      <StaticSection title="4. Photo visibility">
        <p>
          Photos are stored in a private bucket. Women can see men&apos;s photos while
          browsing Discover. A man can only see a woman&apos;s photos after she starts
          a conversation with him. This is enforced at the database level, not just in
          the app&apos;s interface.
        </p>
      </StaticSection>

      <StaticSection title="5. Your rights">
        <p>You can, at any time:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Edit or remove your profile information and photos.</li>
          <li>Request a copy of the data associated with your account.</li>
          <li>Request deletion of your account and associated data.</li>
        </ul>
        <p>
          To request a data export or deletion, email{" "}
          <a href="mailto:privacy@charms.app" className="font-medium text-plum underline-offset-4 hover:underline">
            privacy@charms.app
          </a>
          . We&apos;ll act on verified requests within 30 days.
        </p>
      </StaticSection>

      <StaticSection title="6. Data retention">
        <p>
          We retain your data for as long as your account is active. If you delete your
          account, your profile, photos, quiz responses, and messages are removed within
          30 days, except where retention is required by law.
        </p>
      </StaticSection>

      <StaticSection title="7. Cookies & sessions">
        <p>
          We use a session cookie to keep you signed in. We don&apos;t use third-party
          advertising or tracking cookies.
        </p>
      </StaticSection>

      <StaticSection title="8. Age requirement">
        <p>
          Charms is for users 18 and older. We don&apos;t knowingly collect data from
          anyone under 18.
        </p>
      </StaticSection>

      <StaticSection title="9. Changes to this policy">
        <p>
          If we make material changes, we&apos;ll update the date above and notify users
          in-app.
        </p>
      </StaticSection>

      <StaticSection title="10. Contact">
        <p>
          Questions about this policy? Email{" "}
          <a href="mailto:privacy@charms.app" className="font-medium text-plum underline-offset-4 hover:underline">
            privacy@charms.app
          </a>
          .
        </p>
      </StaticSection>
    </StaticPage>
  );
}
