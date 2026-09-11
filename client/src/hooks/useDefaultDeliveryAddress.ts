import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { SavedAddressRow } from '../types/address';

export type DeliveryAddressDisplay = {
  primary: string;
  secondary: string | null;
};

function formatDeliveryAddress(row: SavedAddressRow): DeliveryAddressDisplay {
  const name = row.recipientName?.trim() || row.label?.trim() || 'Saved address';
  const line = [row.line1, row.line2].filter((s) => s?.trim()).join(', ');
  const locality = [row.city, row.postalCode].filter((s) => s?.trim()).join(' ');
  const secondary = [line, locality].filter((s) => s?.trim()).join(' · ') || null;
  return { primary: name, secondary };
}

export function useDefaultDeliveryAddress() {
  const { user, loading: authLoading } = useAuth();
  const [address, setAddress] = useState<DeliveryAddressDisplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setAddress(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ addresses: SavedAddressRow[] }>('/api/me/addresses');
      const def = data.addresses.find((a) => a.isDefault) ?? data.addresses[0];
      setAddress(def ? formatDeliveryAddress(def) : null);
    } catch (e) {
      setAddress(null);
      setError(e instanceof Error ? e.message : 'Could not load address');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  return { address, loading: authLoading || loading, error, refresh, isLoggedIn: Boolean(user) };
}
