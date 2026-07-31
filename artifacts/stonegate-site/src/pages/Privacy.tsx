/**
 * Privacy Policy page
 * Linked from the cookie consent banner (/privacy)
 */
export default function Privacy() {
  return (
    <main className="min-h-screen bg-black text-stone-200">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-white">
          Privacy Policy
        </h1>
        <p className="mb-10 text-sm text-stone-500">Last updated: July 31, 2026</p>

        <section className="space-y-8 text-sm leading-relaxed text-stone-300">

          <div>
            <h2 className="mb-3 text-lg font-medium text-white">Who we are</h2>
            <p>
              Stonegate Intelligence Group ("Stonegate", "we", "us", or "our") provides
              strategic intelligence and advisory services. This policy explains how we
              collect, use, and protect information when you visit{' '}
              <span className="text-stone-200">stonegateig.com</span>.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-medium text-white">Analytics data we collect</h2>
            <p className="mb-3">
              We use <strong className="text-stone-200">Google Analytics 4 (GA4)</strong> and{' '}
              <strong className="text-stone-200">Microsoft Clarity</strong> to understand how
              visitors use our site. These tools collect:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Pages visited and time spent on each page</li>
              <li>Referring website or search engine</li>
              <li>General geographic region (country / city — not precise location)</li>
              <li>Device type, operating system, and browser</li>
              <li>Anonymised interaction events (button clicks, form submissions)</li>
            </ul>
            <p className="mt-3">
              Analytics data is <strong className="text-stone-200">fully anonymised</strong> —
              IP addresses are masked before storage and no personally identifiable information
              is included. We never sell, share, or rent this data to third parties.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-medium text-white">Cookies</h2>
            <p className="mb-3">
              Analytics cookies are only set <em>after</em> you click "Accept analytics" in the
              consent banner. If you decline, no analytics cookies are placed and no tracking
              occurs during your visit.
            </p>
            <p>
              Cookies used by GA4 include <code className="rounded bg-stone-800 px-1">_ga</code>
              {' '}and <code className="rounded bg-stone-800 px-1">_ga_*</code> (2-year expiry),
              used solely to distinguish unique visitors. Microsoft Clarity uses{' '}
              <code className="rounded bg-stone-800 px-1">_clck</code> and{' '}
              <code className="rounded bg-stone-800 px-1">_clsk</code> cookies for session
              replay and heatmap analysis.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-medium text-white">Data retention</h2>
            <p>
              GA4 retains event-level data for 14 months by default. Aggregated reports may be
              kept indefinitely. Microsoft Clarity session recordings are retained for 30 days.
              You can request earlier deletion at any time (see "Your rights" below).
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-medium text-white">Your rights & opt-out</h2>
            <p className="mb-3">
              You have the right to access, correct, or delete personal data we hold about you,
              and to withdraw consent at any time. To opt out of analytics tracking:
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong className="text-stone-200">Clear consent &amp; cookies:</strong> Clear
                your browser cookies for this site; the consent banner will reappear and you
                can choose "Decline".
              </li>
              <li>
                <strong className="text-stone-200">Google Analytics opt-out:</strong> Install
                the{' '}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-white"
                >
                  Google Analytics opt-out browser add-on
                </a>
                .
              </li>
              <li>
                <strong className="text-stone-200">Microsoft Clarity opt-out:</strong> Visit
                {' '}
                <a
                  href="https://privacy.microsoft.com/en-us/privacystatement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-white"
                >
                  Microsoft's privacy dashboard
                </a>
                .
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-medium text-white">Third-party services</h2>
            <p>
              Our analytics providers process data under their own privacy policies. We encourage
              you to review the{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-white"
              >
                Google Privacy Policy
              </a>{' '}
              and the{' '}
              <a
                href="https://privacy.microsoft.com/en-us/privacystatement"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-white"
              >
                Microsoft Privacy Statement
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-medium text-white">Changes to this policy</h2>
            <p>
              We may update this policy as our practices change. Material changes will be
              reflected in an updated "Last updated" date at the top of this page.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-medium text-white">Contact us</h2>
            <p>
              For privacy-related questions or to exercise your rights, please reach out via our{' '}
              <a
                href="/contact"
                className="underline underline-offset-2 hover:text-white"
              >
                contact page
              </a>
              .
            </p>
          </div>

        </section>
      </div>
    </main>
  );
}
