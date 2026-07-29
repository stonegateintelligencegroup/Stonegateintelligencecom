import { useEffect } from 'react';
import { useLocation } from 'wouter';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Fires a GA4 page_view event on every wouter route change,
 * including the initial load. Tracking failures are swallowed
 * so ad-blockers or missing gtag never break the site.
 */
export function useGAPageTracking() {
  const [location] = useLocation();

  useEffect(() => {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_path: location,
        });
      }
    } catch {
      // analytics failures must never break the site
    }
  }, [location]);
}
