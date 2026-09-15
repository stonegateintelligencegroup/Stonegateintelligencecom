export const GA_MEASUREMENT_ID = 'G-CMZGEPWT6L';
export const ANALYTICS_CONSENT_STORAGE_KEY = 'sg_analytics_consent';

const PRODUCTION_ANALYTICS_HOSTS = new Set([
  'stonegateintelligence.com',
  'www.stonegateintelligence.com',
]);

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __stonegateAnalyticsInitialized?: boolean;
  }
}

export function isProductionAnalyticsHost(): boolean {
  return PRODUCTION_ANALYTICS_HOSTS.has(window.location.hostname.toLowerCase());
}

export function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) === 'accepted';
  } catch {
    return false;
  }
}

/**
 * Initializes the production GA4 tag with analytics and advertising storage denied.
 * Preview, development, localhost, and temporary hosts never load the production tag.
 */
export function initializeAnalytics(): void {
  if (!isProductionAnalyticsHost() || window.__stonegateAnalyticsInitialized) return;

  window.__stonegateAnalyticsInitialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer?.push(arguments);
  };

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500,
  });
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    allow_ad_personalization_signals: false,
    allow_google_signals: false,
    send_page_view: false,
  });

  const script = document.createElement('script');
  script.id = 'stonegate-ga4';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/**
 * Fires a consent-aware GA4 event only from the production hostname.
 * Returns true when the event was queued for GA4.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): boolean {
  if (!isProductionAnalyticsHost() || !hasAnalyticsConsent()) return false;

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
      return true;
    }
  } catch {
    // analytics failures must never break the site
  }

  return false;
}
