import { useEffect, useRef } from 'react';
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
  const previousPage = useRef(document.referrer);

  useEffect(() => {
    if (status !== 'accepted') return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const currentPage = window.location.href;
      const tracked = trackEvent('page_view', {
        page_location: currentPage,
        page_path: `${window.location.pathname}${window.location.search}`,
        page_title: document.title,
        page_referrer: previousPage.current,
      });

      if (tracked) previousPage.current = currentPage;
    });

    return () => {
      cancelled = true;
    };
  }, [location, status]);
}
