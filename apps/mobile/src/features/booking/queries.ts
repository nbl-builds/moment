import { addDaysToLocalDate, toLocalDate } from '@moment/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { chainVisits, type FreeTime } from './chain';
import { guestCount, type BookingDraft, type DraftService } from './draft';

export type Listing = Awaited<ReturnType<typeof api.catalog.getListing>>;
export type UpcomingSlot = Awaited<ReturnType<typeof api.bookings.upcomingSlots>>[number];
export type PublicCoupon = Awaited<ReturnType<typeof api.bookings.publicCoupons>>[number];

/** How far ahead the calendar offers days. */
export const BOOKING_WINDOW_DAYS = 60;

export const bookingKeys = {
  listing: (id: string) => ['listing', id] as const,
  slots: (listingId: string) => ['booking', 'slots', listingId] as const,
  dates: (ids: string[], month: string) => ['booking', 'dates', ids.join(','), month] as const,
  times: (ids: string[], date: string) => ['booking', 'times', ids.join(','), date] as const,
  coupons: (businessId: string) => ['booking', 'coupons', businessId] as const,
};

export function useListing(id: string | undefined) {
  return useQuery({ queryKey: bookingKeys.listing(id ?? ''), queryFn: () => api.catalog.getListing(id as string), enabled: Boolean(id) });
}

/** Sessions for the next three weeks on "Select dates". */
export function useUpcomingSlots(listingId: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.slots(listingId ?? ''),
    queryFn: () => api.bookings.upcomingSlots({ listingId: listingId as string }),
    enabled: Boolean(listingId),
  });
}

/**
 * Days in a month (YYYY-MM-01 .. end) where every service in the cart has a
 * free time. Chaining on the day is checked by `useVisitTimes`.
 */
export function useAvailableDates(serviceIds: string[], monthStart: string, enabled = true) {
  return useQuery({
    queryKey: bookingKeys.dates(serviceIds, monthStart),
    queryFn: async () => {
      const today = toLocalDate(Date.now());
      const from = monthStart < today ? today : monthStart;
      const to = addDaysToLocalDate(nextMonth(monthStart), -1);
      if (from > to) return new Set<string>();
      const sets = await Promise.all(serviceIds.map((listingId) => api.bookings.availableDates({ listingId, from, to })));
      const [first, ...rest] = sets;
      return new Set([...(first ?? [])].filter((d) => rest.every((s) => s.has(d))));
    },
    enabled: enabled && serviceIds.length > 0,
    placeholderData: keepPreviousData,
  });
}

/** Times on a day when the whole cart fits back to back ("Select Time"). */
export function useVisitTimes(serviceIds: string[], date: string | null) {
  return useQuery({
    queryKey: bookingKeys.times(serviceIds, date ?? ''),
    queryFn: async () => {
      const perService = await Promise.all(
        serviceIds.map((listingId) => api.bookings.listAvailableTimes({ listingId, date: date as string })),
      );
      const now = Date.now();
      return chainVisits(perService.map(dedupeByStart)).filter((v) => new Date(v.startsAt).getTime() > now);
    },
    enabled: Boolean(date) && serviceIds.length > 0,
  });
}

/** The first visit in the next two weeks, to preselect on Confirm. */
export async function firstVisit(serviceIds: string[]) {
  const today = toLocalDate(Date.now());
  for (let d = 0; d < 14; d++) {
    const date = addDaysToLocalDate(today, d);
    const perService = await Promise.all(serviceIds.map((listingId) => api.bookings.listAvailableTimes({ listingId, date })));
    const visits = chainVisits(perService.map(dedupeByStart)).filter((v) => new Date(v.startsAt).getTime() > Date.now());
    if (visits[0]) return visits[0];
  }
  return null;
}

/** Several staff can be free at the same time; keep one time per start. */
function dedupeByStart(times: FreeTime[]): FreeTime[] {
  const seen = new Set<string>();
  return times.filter((t) => (seen.has(t.starts_at) ? false : (seen.add(t.starts_at), true)));
}

export function usePublicCoupons(businessId: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.coupons(businessId ?? ''),
    queryFn: () => api.bookings.publicCoupons(businessId as string),
    enabled: Boolean(businessId),
  });
}

export interface Quote {
  subtotal: number;
  /** The listing's own discount (large group or early bird). */
  offerDiscount: number;
  offerLabel: string | null;
  /** Coupon discount. */
  discount: number;
  couponTitle: string | null;
  couponError: string | null;
}

/**
 * Server prices for the checkout. A services cart is quoted per service;
 * the coupon goes on the most expensive one, as `create_bookings` does.
 */
export function useQuote(draft: BookingDraft | null) {
  const item = draft?.item;
  const guests = draft ? guestCount(draft.guests) : 1;
  const coupon = draft?.couponCode ?? null;
  return useQuery({
    queryKey: ['booking', 'quote', quoteKey(draft), guests, coupon, startKey(draft)],
    queryFn: async (): Promise<Quote> => {
      if (!item) throw new Error('No checkout');
      if (item.kind === 'membership') return { subtotal: item.price, offerDiscount: 0, offerLabel: null, discount: 0, couponTitle: null, couponError: null };
      if (item.kind === 'slot') {
        const q = await api.bookings.quote({
          listingId: item.listingId,
          guestCount: guests,
          couponCode: coupon ?? undefined,
          private: item.private,
          startsAt: item.startsAt,
        });
        return { subtotal: q.subtotal, offerDiscount: q.offerDiscount, offerLabel: q.offerLabel, discount: q.discount, couponTitle: q.couponTitle, couponError: q.couponError };
      }
      const top = mostExpensive(item.services);
      const quotes = await Promise.all(
        item.services.map((s) =>
          api.bookings.quote({
            listingId: s.listingId,
            couponCode: s.listingId === top?.listingId ? (coupon ?? undefined) : undefined,
            startsAt: item.visit?.times.find((t) => t.listingId === s.listingId)?.startsAt ?? item.visit?.startsAt,
          }),
        ),
      );
      const withCoupon = quotes[item.services.findIndex((s) => s.listingId === top?.listingId)];
      const offered = quotes.filter((q) => q.offerDiscount > 0);
      return {
        subtotal: quotes.reduce((sum, q) => sum + q.subtotal, 0),
        offerDiscount: offered.reduce((sum, q) => sum + q.offerDiscount, 0),
        offerLabel: offered.length === 1 ? offered[0]!.offerLabel : offered.length > 1 ? 'Offers' : null,
        discount: withCoupon?.discount ?? 0,
        couponTitle: withCoupon?.couponTitle ?? null,
        couponError: withCoupon?.couponError ?? null,
      };
    },
    enabled: Boolean(item),
    placeholderData: keepPreviousData,
  });
}

function startKey(draft: BookingDraft | null) {
  const item = draft?.item;
  if (item?.kind === 'slot') return item.startsAt;
  if (item?.kind === 'services') return item.visit?.startsAt ?? '';
  return '';
}

function quoteKey(draft: BookingDraft | null) {
  const item = draft?.item;
  if (!item) return '';
  if (item.kind === 'services') return item.services.map((s) => s.listingId).join(',');
  if (item.kind === 'slot') return `${item.listingId}:${item.private ? 'private' : 'shared'}`;
  return item.planId;
}

export const mostExpensive = (services: DraftService[]) =>
  services.reduce<DraftService | undefined>((top, s) => (!top || s.price > top.price ? s : top), undefined);

/** "2026-11-01" -> "2026-12-01". */
export function nextMonth(monthStart: string): string {
  const [y, m] = monthStart.split('-').map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

export function prevMonth(monthStart: string): string {
  const [y, m] = monthStart.split('-').map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, '0')}-01`;
}
