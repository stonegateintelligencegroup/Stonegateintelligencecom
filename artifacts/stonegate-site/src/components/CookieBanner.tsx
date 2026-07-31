import { useCookieConsent } from '@/context/CookieConsentContext';

/**
 * Lightweight GDPR/CCPA cookie consent banner.
 * Renders only when consent is still pending (first visit or cleared storage).
 * Appearance matches the Stonegate dark theme.
 */
export default function CookieBanner() {
  const { status, accept, decline } = useCookieConsent();

  if (status !== 'pending') return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-700 bg-stone-900/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-stone-300">
          We use analytics cookies to understand how visitors use our site.
          Your data stays anonymous and is never sold.{' '}
          <a
            href="/privacy"
            className="underline underline-offset-2 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 rounded"
          >
            Privacy policy
          </a>
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={decline}
            className="rounded border border-stone-600 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:border-stone-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="rounded bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}
