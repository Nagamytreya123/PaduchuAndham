import { getMeasurementId, isAnalyticsEnabled } from './config';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let initialized = false;

function ensureGtagStub(): void {
  window.dataLayer = window.dataLayer ?? [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  }
}

/** Load gtag.js and configure GA4. Safe to call multiple times. */
export function initAnalytics(): void {
  const measurementId = getMeasurementId();
  if (!measurementId || initialized) return;

  initialized = true;
  ensureGtagStub();
  window.gtag!('js', new Date());
  window.gtag!('config', measurementId, {
    send_page_view: false,
    anonymize_ip: true,
    allow_google_signals: true,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

export function gtag(...args: unknown[]): void {
  if (!isAnalyticsEnabled()) return;
  ensureGtagStub();
  window.gtag!(...args);
}

export function trackPageView(path: string, title?: string): void {
  const measurementId = getMeasurementId();
  if (!measurementId) return;
  gtag('event', 'page_view', {
    page_path: path,
    page_title: title ?? document.title,
    page_location: window.location.href,
    send_to: measurementId,
  });
}

export function setAnalyticsUser(
  userId: string | null,
  props?: { role?: 'admin' | 'customer' },
): void {
  const measurementId = getMeasurementId();
  if (!measurementId) return;

  if (userId) {
    gtag('config', measurementId, { user_id: userId });
    gtag('set', 'user_properties', {
      user_role: props?.role ?? 'customer',
    });
  } else {
    gtag('config', measurementId, { user_id: undefined });
    gtag('set', 'user_properties', {
      user_role: undefined,
    });
  }
}

export type GtagEventParams = Record<string, string | number | boolean | undefined | object>;

export function trackEvent(name: string, params?: GtagEventParams): void {
  gtag('event', name, params);
}
