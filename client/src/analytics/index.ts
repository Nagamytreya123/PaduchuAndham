export { getMeasurementId, isAnalyticsEnabled } from './config';
export { initAnalytics, trackPageView, setAnalyticsUser, trackEvent } from './gtag';
export {
  trackLogin,
  trackSignUp,
  trackAddToCart,
  trackBeginCheckout,
  trackPurchase,
  trackViewItem,
  cartLinesToGaItems,
} from './events';
export { startWebVitalsReporting } from './webVitals';
