import type { CartLine } from '../context/CartContext';
import { trackEvent } from './gtag';

export type GaItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
};

const CURRENCY = 'INR';

/** Map cart lines to GA4 items (bundles collapsed to one line each). */
export function cartLinesToGaItems(lines: CartLine[]): GaItem[] {
  const items: GaItem[] = [];
  const seenBundles = new Set<string>();

  for (const line of lines) {
    if (line.bundleGroupId) {
      if (seenBundles.has(line.bundleGroupId)) continue;
      seenBundles.add(line.bundleGroupId);
      const unitPaise =
        line.bundleUnitTotalPaise ??
        lines
          .filter((l) => l.bundleGroupId === line.bundleGroupId)
          .reduce((sum, l) => sum + l.price, 0);
      items.push({
        item_id: line.bundleGroupId,
        item_name: line.bundleDisplayName ?? 'Bundle',
        price: unitPaise / 100,
        quantity: line.qty,
      });
    } else {
      items.push({
        item_id: line.productId,
        item_name: line.name,
        price: line.price / 100,
        quantity: line.qty,
      });
    }
  }
  return items;
}

function cartValueInr(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + (l.price * l.qty) / 100, 0);
}

export function trackLogin(method: 'email' | 'google' | 'signup'): void {
  trackEvent('login', { method });
}

export function trackSignUp(method: 'email' | 'google'): void {
  trackEvent('sign_up', { method });
}

export function trackAddToCart(lines: CartLine[], addedValuePaise: number): void {
  const items = cartLinesToGaItems(lines);
  trackEvent('add_to_cart', {
    currency: CURRENCY,
    value: addedValuePaise / 100,
    items,
  });
}

export function trackBeginCheckout(lines: CartLine[]): void {
  trackEvent('begin_checkout', {
    currency: CURRENCY,
    value: cartValueInr(lines),
    items: cartLinesToGaItems(lines),
  });
}

export function trackPurchase(orderId: string, lines: CartLine[], valuePaise: number): void {
  trackEvent('purchase', {
    transaction_id: orderId,
    currency: CURRENCY,
    value: valuePaise / 100,
    items: cartLinesToGaItems(lines),
  });
}

export function trackViewItem(item: {
  id: string;
  name: string;
  pricePaise: number;
  category?: string;
}): void {
  trackEvent('view_item', {
    currency: CURRENCY,
    value: item.pricePaise / 100,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        price: item.pricePaise / 100,
        quantity: 1,
        ...(item.category ? { item_category: item.category } : {}),
      },
    ],
  });
}
