import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ProductSummary } from '../types/product';
import type { JewelleryComboSummary } from '../types/jewelleryCombo';

const STORAGE_KEY = 'paduchu-wishlist-v1';

export type WishlistItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
  subtitle?: string;
  href: string;
  savedAt: number;
};

export function comboWishlistId(comboId: string): string {
  return `combo:${comboId}`;
}

export function isComboWishlistId(id: string): boolean {
  return id.startsWith('combo:');
}

function parseStored(raw: string | null): WishlistItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as WishlistItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function productToWishlistItem(product: ProductSummary): WishlistItem {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.images[0],
    subtitle: [product.category, product.subcategory].filter(Boolean).join(' · '),
    href: `/products/${product.id}`,
    savedAt: Date.now(),
  };
}

export function comboToWishlistItem(combo: JewelleryComboSummary): WishlistItem {
  return {
    id: comboWishlistId(combo.id),
    name: combo.name,
    price: combo.price,
    image: combo.images[0],
    subtitle: `${combo.productIds.length} pieces · Curated set`,
    href: `/jewellery-combos/${combo.id}`,
    savedAt: Date.now(),
  };
}

type WishlistCtx = {
  items: WishlistItem[];
  count: number;
  isSaved: (id: string) => boolean;
  toggle: (item: WishlistItem) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const WishlistContext = createContext<WishlistCtx | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>(() =>
    typeof window !== 'undefined' ? parseStored(localStorage.getItem(STORAGE_KEY)) : [],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const isSaved = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const toggle = useCallback((item: WishlistItem) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) return prev.filter((i) => i.id !== item.id);
      return [{ ...item, savedAt: Date.now() }, ...prev];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      isSaved,
      toggle,
      remove,
      clear,
    }),
    [items, isSaved, toggle, remove, clear],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistCtx {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist outside WishlistProvider');
  return ctx;
}
