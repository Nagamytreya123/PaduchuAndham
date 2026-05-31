/** GA4 measurement ID (e.g. G-XXXXXXXX). Analytics is off when unset. */
export function getMeasurementId(): string | undefined {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  return id || undefined;
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(getMeasurementId());
}
