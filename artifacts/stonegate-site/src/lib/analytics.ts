/**
 * Fires a GA4 custom event. Silently swallowed if gtag is not available
 * (ad-blocker, consent not given, etc.) so analytics never breaks the site.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  } catch {
    // analytics failures must never break the site
  }
}
