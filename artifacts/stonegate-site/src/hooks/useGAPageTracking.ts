import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useCookieConsent } from '@/context/CookieConsentContext';
import { trackEvent } from '@/lib/analytics';

/**
 * Fires a GA4 page_view event on every wouter route change,
 * including the initial load. Only fires when the user has
 * accepted analytics cookies. Tracking failures are swallowed
 * so ad-blockers or missing gtag never break the site.
 */
export function useGAPageTracking() {
  const [location] = useLocation();
  const { status } = useCookieConsent();

  useEffect(() => {
    if (status !== 'accepted') return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      trackEvent('page_view', {
        page_location: window.location.href,
        page_path: `${window.location.pathname}${window.location.search}`,
        page_title: document.title,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [location, status]);
}
