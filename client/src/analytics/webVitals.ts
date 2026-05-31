import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { isAnalyticsEnabled } from './config';
import { trackEvent } from './gtag';

function sendWebVital(metric: Metric): void {
  const value = Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value);

  trackEvent(metric.name, {
    value,
    metric_id: metric.id,
    metric_value: metric.value,
    metric_delta: metric.delta,
    metric_rating: metric.rating,
    navigation_type: metric.navigationType,
    non_interaction: true,
    event_category: 'Web Vitals',
  });
}

let started = false;

/** Report Core Web Vitals and related metrics to GA4. */
export function startWebVitalsReporting(): void {
  if (!isAnalyticsEnabled() || started) return;
  started = true;

  onCLS(sendWebVital);
  onFCP(sendWebVital);
  onINP(sendWebVital);
  onLCP(sendWebVital);
  onTTFB(sendWebVital);
}
