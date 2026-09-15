import { useCookieConsent } from '@/context/CookieConsentContext';

/**
 * Lightweight GDPR/CCPA cookie consent banner.
 * Renders for the first consent choice or when a visitor reopens preferences.
 * Appearance matches the Stonegate dark theme.
 */
export default function CookieBanner() {
  const { status, preferencesOpen, accept, decline, closePreferences } = useCookieConsent();

  if (status !== 'pending' && !preferencesOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-live="polite"
      aria-label="Analytics preferences"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-700 bg-stone-900/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm leading-relaxed text-stone-300">
          <p className="font-medium text-white">Analytics preferences</p>
          <p>
            We use Google Analytics only after you accept. No form contents are sent to analytics.{' '}
            <a
              href="/privacy/"
              className="rounded underline underline-offset-2 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              Privacy policy
            </a>
          </p>
          {preferencesOpen && status !== 'pending' && (
            <p className="mt-1 text-xs text-stone-400">
              Analytics is currently {status === 'accepted' ? 'on' : 'off'}.
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-3">
          {preferencesOpen && status !== 'pending' && (
            <button
              onClick={closePreferences}
              className="rounded px-3 py-2 text-sm text-stone-400 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              Close
            </button>
          )}
          <button
            onClick={decline}
            className="rounded border border-stone-600 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:border-stone-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            Turn analytics off
          </button>
          <button
            onClick={accept}
            className="rounded bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            Allow analytics
          </button>
        </div>
      </div>
    </div>
  );
}
