import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy – AstraMap",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-stone-800">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-stone-500 transition-colors hover:text-stone-800"
        >
          ← Back to AstraMap
        </Link>
      </div>

      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-stone-900">
        Privacy Policy
      </h1>
      <p className="mb-8 text-sm text-stone-500">Effective date: April 6, 2025</p>

      <div className="prose prose-stone max-w-none space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-900">1. About AstraMap</h2>
          <p>
            AstraMap (<strong>https://www.astramap.app</strong>) is an AI-assisted astrology
            workspace. You provide birth data, and the app generates natal charts and
            AI-powered interpretations for personal use.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-900">2. Information We Collect</h2>
          <p className="mb-3">
            We collect only the minimum information required to operate the service:
          </p>
          <ul className="ml-4 list-disc space-y-1.5 text-stone-700">
            <li>
              <strong>Google account information</strong> — your name and email address,
              provided when you sign in with Google. We use these only to identify your
              account and send you service-related notices.
            </li>
            <li>
              <strong>Birth data you enter</strong> — name, birth date, birth time, and
              birth location for the subjects of astrology charts you create. This data
              is stored so you can retrieve past charts.
            </li>
            <li>
              <strong>Usage data</strong> — basic server logs (IP address, browser
              user-agent, timestamps) retained for up to 30 days for security and
              debugging purposes.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-900">3. How We Use Your Information</h2>
          <ul className="ml-4 list-disc space-y-1.5 text-stone-700">
            <li>To authenticate you and maintain your session.</li>
            <li>To compute and store astrology charts on your behalf.</li>
            <li>To generate AI interpretations using OpenAI's API (birth data is sent to OpenAI as part of the prompt; it is not stored by us beyond your session).</li>
            <li>To improve and debug the service.</li>
          </ul>
          <p className="mt-3">
            We do <strong>not</strong> sell, rent, or share your personal information
            with third parties for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-900">4. Data Storage &amp; Security</h2>
          <p>
            Account and chart data is stored in{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 underline underline-offset-2 hover:text-amber-900"
            >
              Supabase
            </a>
            , a managed database platform with encryption at rest and in transit.
            AI requests are processed through{" "}
            <a
              href="https://openai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 underline underline-offset-2 hover:text-amber-900"
            >
              OpenAI
            </a>
            . We apply reasonable technical safeguards, but no system is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-900">5. Google OAuth Scopes</h2>
          <p>
            AstraMap requests the following OAuth scopes from Google:
          </p>
          <ul className="ml-4 mt-2 list-disc space-y-1 text-stone-700">
            <li><code className="rounded bg-stone-100 px-1 py-0.5 text-xs">openid</code> — to verify your identity.</li>
            <li><code className="rounded bg-stone-100 px-1 py-0.5 text-xs">email</code> — to associate your account with your email address.</li>
            <li><code className="rounded bg-stone-100 px-1 py-0.5 text-xs">profile</code> — to display your name inside the app.</li>
          </ul>
          <p className="mt-3">
            We do not access your Gmail, Google Drive, Calendar, or any other Google
            service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-900">6. Data Retention &amp; Deletion</h2>
          <p>
            Your account and chart data is retained as long as you use the service. You
            may delete individual chart sessions at any time from within the app. To
            request complete deletion of your account and all associated data, email us
            at{" "}
            <a
              href="mailto:fyuming2@gmail.com"
              className="text-amber-700 underline underline-offset-2 hover:text-amber-900"
            >
              fyuming2@gmail.com
            </a>{" "}
            and we will process the request within 30 days.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-900">7. Children's Privacy</h2>
          <p>
            AstraMap is not directed at children under 13. We do not knowingly collect
            personal information from children under 13. If you believe a child has
            provided us with personal information, please contact us and we will delete it.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-900">8. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Material changes will be
            announced by updating the effective date above. Continued use of AstraMap
            after changes constitutes acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-900">9. Contact</h2>
          <p>
            Questions about this policy? Contact us at{" "}
            <a
              href="mailto:fyuming2@gmail.com"
              className="text-amber-700 underline underline-offset-2 hover:text-amber-900"
            >
              fyuming2@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
