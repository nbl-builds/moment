import { useSyncExternalStore } from 'react';

// Services picked on a business page ("Total Services" cart bar, 47:1828).
// One cart per business, kept in memory for the session so it survives tab
// switches and leaving the page; cleared when the booking starts.

const carts = new Map<string, string[]>();
const listeners = new Set<() => void>();
const EMPTY: string[] = [];

const emit = () => listeners.forEach((l) => l());

export const serviceCart = {
  get: (businessId: string) => carts.get(businessId) ?? EMPTY,
  toggle(businessId: string, serviceId: string) {
    const current = carts.get(businessId) ?? [];
    carts.set(businessId, current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId]);
    emit();
  },
  clear(businessId: string) {
    carts.delete(businessId);
    emit();
  },
  subscribe(listener: () => void) {
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
