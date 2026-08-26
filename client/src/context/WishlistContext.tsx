import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch } from '../api/client';
import type { ProductSummary } from '../types/product';
import { useAuth } from './AuthContext';
import { useCategories } from './CategoriesContext';

const LEGACY_STORAGE_KEY = 'paduchu-wishlist-v1';
const GUEST_STORAGE_KEY = 'paduchu-wishlist-v1:guest';

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

function loadGuestWishlist(): WishlistItem[] {
  const fromGuest = parseStored(localStorage.getItem(GUEST_STORAGE_KEY));
  if (fromGuest.length) return fromGuest;
  const legacy = parseStored(localStorage.getItem(LEGACY_STORAGE_KEY));
  if (legacy.length) {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(legacy));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
  return legacy;
}

function mergeWishlistItems(server: WishlistItem[], guest: WishlistItem[]): WishlistItem[] {
  const map = new Map<string, WishlistItem>();
  for (const item of server) map.set(item.id, item);
  for (const item of guest) {
    const existing = map.get(item.id);
    if (!existing || item.savedAt >= existing.savedAt) map.set(item.id, item);
  }
  return [...map.values()].sort((a, b) => b.savedAt - a.savedAt);
}

/** Strip embedded images — product photos are often multi-MB base64 and exceed API limits. */
function sanitizeWishlistForApi(items: WishlistItem[]): WishlistItem[] {
  return items.map((item) => {
    const image = item.image?.trim();
    const safeImage =
      image && !image.startsWith('data:') && image.length <= 2000 ? image : undefined;
    return {
      id: item.id,
      name: item.name,
      price: Math.round(item.price),
      image: safeImage,
      subtitle: item.subtitle?.slice(0, 500),
      href: item.href,
      savedAt: Math.round(item.savedAt),
    };
  });
}

async function persistWishlist(items: WishlistItem[]): Promise<void> {
  await apiFetch('/api/wishlist', {
    method: 'PUT',
    body: JSON.stringify({ items: sanitizeWishlistForApi(items) }),
  });
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

/** @deprecated Legacy jewellery combo wishlist helper */
export function comboToWishlistItem(combo: {
  id: string;
  name: string;
  price: number;
  images: string[];
  productIds: string[];
}): WishlistItem {
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
  const { user, loading } = useAuth();
  const { removedProductIds, catalogRevision } = useCategories();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const hydrateGen = useRef(0);
  const suppressPersistRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    const gen = ++hydrateGen.current;
    setHydrated(false);
    suppressPersistRef.current = true;

    if (!user) {
      const guest = loadGuestWishlist();
      setItems(guest);
      setHydrated(true);
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
      queueMicrotask(() => {
        if (gen === hydrateGen.current) suppressPersistRef.current = false;
      });
      return;
    }

    setItems([]);
    void (async () => {
      try {
        const data = await apiFetch<{ items: WishlistItem[] }>('/api/wishlist');
        if (gen !== hydrateGen.current) return;
        const serverItems = Array.isArray(data.items) ? data.items : [];
        const guest = loadGuestWishlist();
        setItems((current) => {
          const merged = mergeWishlistItems(
            mergeWishlistItems(serverItems, guest),
            current,
          );
          if (guest.length) {
            localStorage.removeItem(GUEST_STORAGE_KEY);
            void persistWishlist(merged).catch((err) => {
              console.warn('[wishlist] failed to sync merged guest items', err);
            });
          }
          return merged;
        });
      } catch (err) {
        if (gen !== hydrateGen.current) return;
        console.warn('[wishlist] failed to load from server', err);
        setItems([]);
      } finally {
        if (gen === hydrateGen.current) {
          setHydrated(true);
          suppressPersistRef.current = false;
        }
      }
    })();
  }, [loading, user?.id]);

  useEffect(() => {
    if (!hydrated || loading || suppressPersistRef.current) return;
    if (user) {
      void persistWishlist(items).catch((err) => {
        console.warn('[wishlist] failed to save', err);
      });
      return;
    }
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated, loading, user?.id, user]);

  useEffect(() => {
    if (!hydrated || removedProductIds.length === 0) return;
    const idSet = new Set(removedProductIds);
    setItems((prev) => {
      const next = prev.filter((item) => !idSet.has(item.id));
      return next.length === prev.length ? prev : next;
    });
  }, [removedProductIds, catalogRevision, hydrated]);

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
