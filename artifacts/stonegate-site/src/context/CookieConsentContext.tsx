import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ConsentStatus = 'pending' | 'accepted' | 'declined';

const STORAGE_KEY = 'sg_analytics_consent';

function readStoredConsent(): ConsentStatus {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'accepted' || stored === 'declined') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'pending';
}

function applyConsentToGtag(status: 'accepted' | 'declined') {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: status === 'accepted' ? 'granted' : 'denied',
      });
    }
  } catch {
    // analytics failures must never break the site
  }
}

interface CookieConsentContextValue {
  status: ConsentStatus;
  accept: () => void;
  decline: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>('pending');

  // Hydrate from localStorage once on mount and apply to gtag
  useEffect(() => {
    const stored = readStoredConsent();
    setStatus(stored);
    if (stored !== 'pending') {
      applyConsentToGtag(stored);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      // ignore
    }
    applyConsentToGtag('accepted');
    setStatus('accepted');
  };

  const decline = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'declined');
    } catch {
      // ignore
    }
    applyConsentToGtag('declined');
    setStatus('declined');
  };

  return (
    <CookieConsentContext.Provider value={{ status, accept, decline }}>
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
