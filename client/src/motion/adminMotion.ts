/**
 * Admin UI motion map (Framer Motion + MUI theme tokens):
 * - AdminShell: nav list stagger, mobile Drawer, route Outlet cinematic cross-fade.
 * - prefers-reduced-motion: durations ~0, no blur/scale drift.
 */
import { PREMIUM_EASE } from './variants';

/** @deprecated use PREMIUM_EASE for new work */
export const ADMIN_MOTION_EASE = PREMIUM_EASE;

export function adminRouteMotion(reduced: boolean) {
  if (reduced) {
    return {
      initial: false,
      animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
      exit: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 0 } },
      transition: { duration: 0 },
    } as const;
  }
  return {
    initial: { opacity: 0, y: 18, scale: 1.02, filter: 'blur(10px)' },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration: 0.55, ease: PREMIUM_EASE },
    },
    exit: {
      opacity: 0,
      y: -12,
      scale: 0.99,
      filter: 'blur(6px)',
      transition: { duration: 0.35, ease: PREMIUM_EASE },
    },
  } as const;
}
