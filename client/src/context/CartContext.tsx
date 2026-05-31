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
import { trackAddToCart } from '../analytics';
import { useAuth } from './AuthContext';

export type CartLine = {
  productId: string;
  name: string;
  /** Per-unit price in paise (split for bundles — used at checkout). */
  price: number;
  qty: number;
  image?: string;
  /** Present on every line that belongs to one jewellery combo or watch+bracelet bundle. */
  bundleGroupId?: string;
  bundleDisplayName?: string;
  /** Full bundle price for one set (paise). */
  bundleUnitTotalPaise?: number;
  bundleImage?: string;
};

export type AddBundleInput = {
  groupId: string;
  displayName: string;
  unitTotalPaise: number;
  image?: string;
  components: { productId: string; name: string; unitPricePaise: number; image?: string }[];
  qty: number;
};

/** For header badge: standalone qty + bundle set qty (each bundle group counted once). */
export function cartBadgeCount(lines: CartLine[]): number {
  const seenBundle = new Set<string>();
  let n = 0;
  for (const l of lines) {
    if (l.bundleGroupId) {
      if (!seenBundle.has(l.bundleGroupId)) {
        seenBundle.add(l.bundleGroupId);
        n += l.qty;
      }
    } else {
      n += l.qty;
    }
  }
  return n;
}

function mergeCartLines(server: CartLine[], guest: CartLine[]): CartLine[] {
  const collectGroups = (lines: CartLine[]) => {
    const m = new Map<string, CartLine[]>();
    for (const l of lines) {
      if (!l.bundleGroupId) continue;
      const arr = m.get(l.bundleGroupId) ?? [];
      arr.push(l);
      m.set(l.bundleGroupId, arr);
    }
    return m;
  };
  const sg = collectGroups(server);
  const gg = collectGroups(guest);
  const bundleOut: CartLine[] = [];
  const allGids = new Set([...sg.keys(), ...gg.keys()]);
  for (const gid of allGids) {
    const s = sg.get(gid);
    const g = gg.get(gid);
    if (s && g) {
      const qty = s[0]!.qty + g[0]!.qty;
      bundleOut.push(...s.map((l) => ({ ...l, qty })));
    } else if (s) bundleOut.push(...s);
    else if (g) bundleOut.push(...g);
  }
  const bundledPids = new Set(bundleOut.map((l) => l.productId));

  const standaloneMap = new Map<string, CartLine>();
  for (const l of server) {
    if (l.bundleGroupId) continue;
    if (bundledPids.has(l.productId)) continue;
    standaloneMap.set(l.productId, { ...l });
  }
  for (const l of guest) {
    if (l.bundleGroupId) continue;
    if (bundledPids.has(l.productId)) continue;
    const ex = standaloneMap.get(l.productId);
    if (ex) standaloneMap.set(l.productId, { ...ex, qty: ex.qty + l.qty });
    else standaloneMap.set(l.productId, { ...l });
  }

  return [...standaloneMap.values(), ...bundleOut];
}

/** Legacy single-key cart before per-guest isolation */
const LEGACY_STORAGE_KEY = 'paduchu-cart-v1';
const GUEST_STORAGE_KEY = 'paduchu-cart-v1:guest';

type CartCtx = {
  lines: CartLine[];
  add: (line: Omit<CartLine, 'qty'> & { qty?: number }) => void;
  addBundle: (input: AddBundleInput) => void;
  setQty: (productId: string, qty: number) => void;
  setBundleQty: (bundleGroupId: string, qty: number) => void;
  remove: (productId: string) => void;
  removeBundle: (bundleGroupId: string) => void;
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
    const qty = line.qty ?? 1;
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.productId === line.productId && !l.bundleGroupId);
      if (idx === -1) {
        return [...prev, { ...line, qty }];
      }
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        qty: copy[idx]!.qty + qty,
        image: line.image ?? copy[idx]!.image,
        name: line.name || copy[idx]!.name,
      };
      return copy;
    });
    trackAddToCart([{ ...line, qty }], line.price * qty);
  }, []);

  const addBundle = useCallback((input: AddBundleInput) => {
    const addedValuePaise = input.unitTotalPaise * input.qty;
    const trackLines: CartLine[] = input.components.map((c) => ({
      productId: c.productId,
      name: c.name,
      price: c.unitPricePaise,
      qty: input.qty,
      image: c.image,
      bundleGroupId: input.groupId,
      bundleDisplayName: input.displayName,
      bundleUnitTotalPaise: input.unitTotalPaise,
      bundleImage: input.image,
    }));
    const ids = new Set(input.components.map((c) => c.productId));
    setLines((prev) => {
      const existingForGroup = prev.filter((l) => l.bundleGroupId === input.groupId);
      const mergedQty = (existingForGroup[0]?.qty ?? 0) + input.qty;

      const filtered = prev.filter((l) => {
        if (l.bundleGroupId === input.groupId) return false;
        if (ids.has(l.productId)) return false;
        return true;
      });
      const newLines: CartLine[] = input.components.map((c) => ({
        productId: c.productId,
        name: c.name,
        price: c.unitPricePaise,
        qty: mergedQty,
        image: c.image,
        bundleGroupId: input.groupId,
        bundleDisplayName: input.displayName,
        bundleUnitTotalPaise: input.unitTotalPaise,
        bundleImage: input.image,
      }));
      return [...filtered, ...newLines];
    });
    trackAddToCart(trackLines, addedValuePaise);
  }, []);

  const setBundleQty = useCallback((bundleGroupId: string, qty: number) => {
    setLines((prev) => {
      if (qty <= 0) return prev.filter((l) => l.bundleGroupId !== bundleGroupId);
      return prev.map((l) => (l.bundleGroupId === bundleGroupId ? { ...l, qty } : l));
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((prev) => {
      const line = prev.find((l) => l.productId === productId);
      if (line?.bundleGroupId) {
        return prev
          .map((l) => (l.bundleGroupId === line.bundleGroupId ? { ...l, qty } : l))
          .filter((l) => l.qty > 0);
      }
      if (qty <= 0) return prev.filter((l) => l.productId !== productId);
      return prev.map((l) => (l.productId === productId && !l.bundleGroupId ? { ...l, qty } : l));
    });
  }, []);

  const removeBundle = useCallback((bundleGroupId: string) => {
    setLines((prev) => prev.filter((l) => l.bundleGroupId !== bundleGroupId));
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => {
      const hit = prev.find((l) => l.productId === productId);
      if (hit?.bundleGroupId) {
        return prev.filter((l) => l.bundleGroupId !== hit.bundleGroupId);
      }
      return prev.filter((l) => l.productId !== productId);
    });
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totalPaise = useMemo(() => lines.reduce((s, l) => s + l.price * l.qty, 0), [lines]);

  const value = useMemo(
    () => ({
      lines,
      add,
      addBundle,
      setQty,
      setBundleQty,
      remove,
      removeBundle,
      clear,
      totalPaise,
    }),
    [lines, add, addBundle, setQty, setBundleQty, remove, removeBundle, clear, totalPaise],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart outside CartProvider');
  return ctx;
}
