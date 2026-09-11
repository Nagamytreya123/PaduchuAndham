export type ShippingConfig = {
  chargePaise: number;
  freeShippingMinPaise: number | null;
};

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

export function rupeesToPaise(rupees: string): number | null {
  const trimmed = rupees.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function paiseToRupeesInput(paise: number | null | undefined): string {
  if (paise == null) return '';
  return String(paise / 100);
}
