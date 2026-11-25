import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { AUTH_BYPASS } from '@/lib/auth-bypass';

// Services picked on a business page ("Total Services" cart bar, 47:1828).
// One cart per business, saved on the device so it survives restarts; the
// Cart screen (52:8991) lists them. Cleared once booked.

const STORAGE_KEY = 'moment.service-carts.v1';

/** Dev auth bypass: a Saffron Spa cart on first run so the Cart screen has something in it. */
const DEV_DEMO_CART: Record<string, string[]> = {
  '00000000-0000-4000-b000-000000000002': ['00000000-0000-4000-e000-000000000049', '00000000-0000-4000-e000-000000000050'],
};

let carts = new Map<string, string[]>();
let hydrated = false;
const listeners = new Set<() => void>();
const EMPTY: string[] = [];

const emit = () => listeners.forEach((l) => l());

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(carts))).catch(() => undefined);
}

/** Loads saved carts once per app start. Changes made before it finishes win. */
async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const saved: Record<string, string[]> = raw ? JSON.parse(raw) : AUTH_BYPASS ? DEV_DEMO_CART : {};
    const merged = new Map(Object.entries(saved).filter(([, ids]) => Array.isArray(ids) && ids.length > 0));
    for (const [id, ids] of carts) merged.set(id, ids);
    carts = merged;
    if (!raw) persist();
    emit();
  } catch {
    // A broken saved value: start empty.
  }
}

export const serviceCart = {
  get: (businessId: string) => carts.get(businessId) ?? EMPTY,
  /** Business ids with a non-empty cart, most recently changed last. */
  businessIds: () => [...carts.keys()],
  toggle(businessId: string, serviceId: string) {
    const current = carts.get(businessId) ?? [];
    const next = current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId];
    carts = new Map(carts);
    if (next.length) carts.set(businessId, next);
    else carts.delete(businessId);
    persist();
    emit();
  },
  clear(businessId: string) {
    if (!carts.has(businessId)) return;
    carts = new Map(carts);
    carts.delete(businessId);
    persist();
    emit();
  },
  subscribe(listener: () => void) {
    void hydrate();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** The selected service ids for a business (re-renders on change). */
export function useServiceCart(businessId: string | undefined) {
  return useSyncExternalStore(serviceCart.subscribe, () => (businessId ? serviceCart.get(businessId) : EMPTY));
}

/** All saved carts as a map of business id -> service ids (Cart screen, header badge). */
export function useServiceCarts() {
  return useSyncExternalStore(serviceCart.subscribe, () => carts);
}
