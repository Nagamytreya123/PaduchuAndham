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
import { useAuth } from './AuthContext';

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
};

/** Legacy single-key cart before per-guest isolation */
const LEGACY_STORAGE_KEY = 'paduchu-cart-v1';
const GUEST_STORAGE_KEY = 'paduchu-cart-v1:guest';

type CartCtx = {
  lines: CartLine[];
  add: (line: Omit<CartLine, 'qty'> & { qty?: number }) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  totalPaise: number;
};

const CartContext = createContext<CartCtx | null>(null);

function parseStored(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadGuestCart(): CartLine[] {
  const fromGuest = parseStored(localStorage.getItem(GUEST_STORAGE_KEY));
  if (fromGuest.length) return fromGuest;
  const legacy = parseStored(localStorage.getItem(LEGACY_STORAGE_KEY));
  if (legacy.length) {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(legacy));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
  return legacy;
}

function mergeCartLines(server: CartLine[], guest: CartLine[]): CartLine[] {
  const map = new Map<string, CartLine>();
  for (const line of server) {
    map.set(line.productId, { ...line });
  }
  for (const line of guest) {
    const existing = map.get(line.productId);
    if (existing) {
      map.set(line.productId, { ...existing, qty: existing.qty + line.qty });
    } else {
      map.set(line.productId, { ...line });
    }
  }
  return Array.from(map.values());
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  /** When true, cart for current mode (guest vs user) has been loaded; enables persistence. */
  const [hydrated, setHydrated] = useState(false);
  const hydrateGen = useRef(0);
  /** True while hydrate is replacing `lines` for a new guest/user — blocks persist from using stale lines. */
  const suppressPersistRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    const gen = ++hydrateGen.current;
    setHydrated(false);
    suppressPersistRef.current = true;

    if (!user) {
      const g = loadGuestCart();
      setLines(g);
      setHydrated(true);
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(g));
      queueMicrotask(() => {
        if (gen === hydrateGen.current) suppressPersistRef.current = false;
      });
      return;
    }

    setLines([]);
    void (async () => {
      try {
        const data = await apiFetch<{ items: CartLine[] }>('/api/cart');
        if (gen !== hydrateGen.current) return;
        const serverItems = Array.isArray(data.items) ? data.items : [];
        const guest = loadGuestCart();
        const merged = guest.length ? mergeCartLines(serverItems, guest) : serverItems;
        setLines(merged);
        if (guest.length) {
          localStorage.removeItem(GUEST_STORAGE_KEY);
          await apiFetch('/api/cart', {
            method: 'PUT',
            body: JSON.stringify({ items: merged }),
          });
        }
      } catch {
        if (gen !== hydrateGen.current) return;
        setLines([]);
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
      void apiFetch('/api/cart', {
        method: 'PUT',
        body: JSON.stringify({ items: lines }),
      }).catch(() => {
        /* offline or session expired; cart still in memory */
      });
      return;
    }
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated, loading, user?.id, user]);

  const add = useCallback((line: Omit<CartLine, 'qty'> & { qty?: number }) => {
    setLines((prev) => {
      const qty = line.qty ?? 1;
      const idx = prev.findIndex((l) => l.productId === line.productId);
      if (idx === -1) {
        return [...prev, { ...line, qty }];
      }
      const copy = [...prev];
      copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
      return copy;
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((prev) => {
      if (qty <= 0) return prev.filter((l) => l.productId !== productId);
      return prev.map((l) => (l.productId === productId ? { ...l, qty } : l));
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totalPaise = useMemo(() => lines.reduce((s, l) => s + l.price * l.qty, 0), [lines]);

  const value = useMemo(
    () => ({
      lines,
      add,
      setQty,
      remove,
      clear,
      totalPaise,
    }),
    [lines, add, setQty, remove, clear, totalPaise],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart outside CartProvider');
  return ctx;
}
