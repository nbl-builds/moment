import { useSyncExternalStore } from 'react';

// The checkout in progress (Confirm Reservation). Kept in memory so it
// survives the login sheet, the phone code screen and the pickers; one at a
// time, replaced when a new checkout starts.

export interface DraftGuests {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

export interface DraftService {
  listingId: string;
  title: string;
  price: number;
  durationMinutes: number;
}

/** The picked visit for a services cart: one free time per service, back to back. */
export interface DraftVisit {
  startsAt: string;
  endsAt: string;
  times: { listingId: string; startsAt: string; staffId: string }[];
}

/** One booking line on Confirm, by entry flow. */
export type DraftItem =
  | { kind: 'services'; businessId: string; services: DraftService[]; visit: DraftVisit | null }
  | {
      kind: 'slot';
      businessId: string;
      listingId: string;
      title: string;
      slotId: string;
      startsAt: string;
      endsAt: string;
      private: boolean;
      hostName: string | null;
      maxGuests: number;
      minGuests: number;
      petsAllowed: boolean;
    }
  | { kind: 'membership'; businessId: string; planId: string; name: string; price: number; period: string };

export interface BookingDraft {
  item: DraftItem;
  guests: DraftGuests;
  notes: string;
  couponCode: string | null;
  paymentMethod: string;
  /** Same key on every retry of this checkout, so nothing is booked twice. */
  idempotencyKey: string;
}

let draft: BookingDraft | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const newKey = () => `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const bookingDraft = {
  get: () => draft,
  start(item: DraftItem, guests?: Partial<DraftGuests>) {
    draft = {
      item,
      guests: { adults: 1, children: 0, infants: 0, pets: 0, ...guests },
      notes: '',
      couponCode: null,
      paymentMethod: 'card',
      idempotencyKey: newKey(),
    };
    emit();
  },
  update(patch: Partial<BookingDraft>) {
    if (!draft) return;
    // Anything that changes what is booked gets a fresh key.
    const changesBooking = 'item' in patch || 'guests' in patch || 'couponCode' in patch;
    draft = { ...draft, ...patch, ...(changesBooking ? { idempotencyKey: newKey() } : null) };
    emit();
  },
  clear() {
    draft = null;
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useBookingDraft() {
  return useSyncExternalStore(bookingDraft.subscribe, bookingDraft.get);
}

export const guestCount = (g: DraftGuests) => g.adults + g.children;

/** "3 Adults, 1 Child, 1 Infant" */
export function guestsLabel(g: DraftGuests) {
  const part = (n: number, one: string, many: string) => (n > 0 ? `${n} ${n === 1 ? one : many}` : null);
  return [part(g.adults, 'Adult', 'Adults'), part(g.children, 'Child', 'Children'), part(g.infants, 'Infant', 'Infants'), part(g.pets, 'Pet', 'Pets')]
    .filter(Boolean)
    .join(', ');
}
