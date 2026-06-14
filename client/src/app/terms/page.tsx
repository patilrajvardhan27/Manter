import { StaticPage, StaticSection } from "@/components/StaticPage";

export default function TermsPage() {
  return (
    <StaticPage
      eyebrow="Legal"
      title="Terms of Service"
      subtitle="Last updated: June 14, 2026. By creating an account, you agree to these terms."
    >
      <StaticSection title="1. Eligibility">
        <p>
          You must be at least 18 years old to use Manter. By creating an account, you
          confirm that you meet this requirement and that the information you provide is
          accurate.
        </p>
      </StaticSection>

      <StaticSection title="2. Your account">
        <p>
          You&apos;re responsible for keeping your login credentials secure and for
          activity that happens under your account. One person, one account — accounts
          may not be shared, sold, or transferred.
        </p>
      </StaticSection>

      <StaticSection title="3. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Misrepresent your identity, age, or intentions.</li>
          <li>Harass, threaten, or send unwanted explicit content to other users.</li>
          <li>Use the platform to advertise, solicit, or scam other users.</li>
          <li>Attempt to circumvent verification, scoring, or red-flag detection systems.</li>
          <li>Scrape, copy, or republish other users&apos; profiles or content.</li>
        </ul>
        <p>Violating these terms may result in suspension or termination of your account.</p>
      </StaticSection>

      <StaticSection title="4. Character scores & AI features">
        <p>
          Character scores, quiz results, verification badges, and AI red-flag scans are
          provided as informational tools to help you make decisions — they are{" "}
          <strong className="font-medium text-ink">not a guarantee</strong> of any
          person&apos;s character, intentions, or safety. Manter does not perform criminal
          background checks unless explicitly stated on a profile. You&apos;re always
          responsible for your own judgment and safety decisions, including whether and
          how to meet someone in person.
        </p>
      </StaticSection>

      <StaticSection title="5. Your content">
        <p>
          You retain ownership of the photos, profile information, and messages you
          submit. By posting them, you grant Manter a license to store and display them
          as needed to operate the service (e.g. showing your profile to matches,
          processing quiz answers and messages for scoring as described in our{" "}
          <a href="/privacy" className="font-medium text-plum underline-offset-4 hover:underline">Privacy Policy</a>).
        </p>
      </StaticSection>

      <StaticSection title="6. Disclaimers">
        <p>
          Manter is provided &quot;as is&quot;. We don&apos;t warrant that the service
          will be uninterrupted, error-free, or that any AI-generated assessment is
          accurate or complete. To the extent permitted by law, Manter is not liable for
          interactions, relationships, or meetings that occur as a result of using the
          service.
        </p>
      </StaticSection>

      <StaticSection title="7. Termination">
        <p>
          You can delete your account at any time. We may suspend or terminate accounts
          that violate these terms, including those flagged repeatedly through our
          red-flag and reporting systems.
        </p>
      </StaticSection>

      <StaticSection title="8. Changes to these terms">
        <p>
          We may update these terms occasionally. If we make material changes, we&apos;ll
          update the date above and notify users in-app.
        </p>
      </StaticSection>

      <StaticSection title="9. Contact">
        <p>
          Questions about these terms? Email{" "}
          <a href="mailto:support@manter.app" className="font-medium text-plum underline-offset-4 hover:underline">
            support@manter.app
          </a>
          .
        </p>
      </StaticSection>
    </StaticPage>
  );
}
