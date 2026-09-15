import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  isProductionAnalyticsHost,
} from '@/lib/analytics';

export type ConsentStatus = 'pending' | 'accepted' | 'declined';

function readStoredConsent(): ConsentStatus {
  try {
    const stored = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (stored === 'accepted' || stored === 'declined') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'pending';
}

function applyConsentToGtag(status: 'accepted' | 'declined') {
  try {
    if (isProductionAnalyticsHost() && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: status === 'accepted' ? 'granted' : 'denied',
      });
    }
  } catch {
    // analytics failures must never break the site
  }
}

function clearAnalyticsCookies() {
  try {
    const cookieNames = document.cookie
      .split(';')
      .map((cookie) => cookie.split('=')[0]?.trim())
      .filter((name): name is string => Boolean(name && (name === '_ga' || name.startsWith('_ga_'))));

    for (const name of cookieNames) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.stonegateintelligence.com; SameSite=Lax`;
    }
  } catch {
    // cookie access unavailable
  }
}

interface CookieConsentContextValue {
  status: ConsentStatus;
  preferencesOpen: boolean;
  accept: () => void;
  decline: () => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>(readStoredConsent);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Hydrate from localStorage once on mount and apply to gtag
  useEffect(() => {
    const stored = readStoredConsent();
    if (stored !== 'pending') {
      applyConsentToGtag(stored);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, 'accepted');
    } catch {
      // ignore
    }
    applyConsentToGtag('accepted');
    setStatus('accepted');
    setPreferencesOpen(false);
  };

  const decline = () => {
    try {
      localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, 'declined');
    } catch {
      // ignore
    }
    applyConsentToGtag('declined');
    clearAnalyticsCookies();
    setStatus('declined');
    setPreferencesOpen(false);
  };

  return (
    <CookieConsentContext.Provider
      value={{
        status,
        preferencesOpen,
        accept,
        decline,
        openPreferences: () => setPreferencesOpen(true),
        closePreferences: () => setPreferencesOpen(false),
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return ctx;
}
