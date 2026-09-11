/** Default flat shipping charge: ₹100 */
export const DEFAULT_SHIPPING_CHARGE_PAISE = 10_000;

export type ShippingConfig = {
  chargePaise: number;
  freeShippingMinPaise: number | null;
};

export function normalizeShippingChargePaise(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : NaN;
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('Shipping charge must be zero or a positive amount in paise.');
  }
  return n;
}

export function normalizeFreeShippingMinPaise(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : NaN;
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('Free-shipping minimum must be a positive amount in paise.');
  }
  return n;
}

export function resolveShippingChargePaise(stored: unknown): number {
  if (stored === undefined || stored === null) return DEFAULT_SHIPPING_CHARGE_PAISE;
  try {
    return normalizeShippingChargePaise(stored);
  } catch {
    return DEFAULT_SHIPPING_CHARGE_PAISE;
  }
}

export function resolveFreeShippingMinPaise(stored: unknown): number | null {
  if (stored === undefined || stored === null) return null;
  try {
    return normalizeFreeShippingMinPaise(stored);
  } catch {
    return null;
  }
}

export function shippingConfigFromRow(row: {
  shippingChargePaise?: unknown;
  freeShippingMinPaise?: unknown;
} | null): ShippingConfig {
  return {
    chargePaise: resolveShippingChargePaise(row?.shippingChargePaise),
    freeShippingMinPaise: resolveFreeShippingMinPaise(row?.freeShippingMinPaise),
  };
}

/** Whole rupees as shown in the storefront (0 decimal places). */
function displayRupees(paise: number): number {
  return Math.round(paise / 100);
}

export function qualifiesForFreeShipping(subtotalPaise: number, config: ShippingConfig): boolean {
  if (config.freeShippingMinPaise == null || subtotalPaise <= 0) return false;
  return displayRupees(subtotalPaise) >= displayRupees(config.freeShippingMinPaise);
}

export function paiseUntilFreeShipping(subtotalPaise: number, config: ShippingConfig): number | null {
  if (config.freeShippingMinPaise == null || qualifiesForFreeShipping(subtotalPaise, config)) {
    return null;
  }
  const gapRupees = displayRupees(config.freeShippingMinPaise) - displayRupees(subtotalPaise);
  return Math.max(0, gapRupees) * 100;
}

export function computeShippingPaise(subtotalPaise: number, config: ShippingConfig): number {
  if (subtotalPaise <= 0) return 0;
  if (qualifiesForFreeShipping(subtotalPaise, config)) return 0;
  return config.chargePaise;
}
