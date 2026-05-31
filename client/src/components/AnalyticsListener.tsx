import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  initAnalytics,
  setAnalyticsUser,
  startWebVitalsReporting,
  trackPageView,
} from '../analytics';

/** SPA page views, signed-in user id for GA4, and Web Vitals. */
export function AnalyticsListener() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    initAnalytics();
    startWebVitalsReporting();
  }, []);

  useEffect(() => {
    const path = location.pathname + location.search;
    if (path === lastPath.current) return;
    lastPath.current = path;
    trackPageView(path);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      setAnalyticsUser(user.id, { role: user.role });
    } else {
      setAnalyticsUser(null);
    }
  }, [user, loading]);

  return null;
}
