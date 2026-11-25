import { useEffect, useRef } from 'react';
import { bookingDraft, type BookingDraft } from '@/features/booking/draft';
import { useSavedCoupons } from '@/features/profile/queries';

type SavedCoupon = NonNullable<ReturnType<typeof useSavedCoupons>['data']>[number];

/** Best saved coupon for a business: active, not expired, this business's own first, then Moment-wide. */
export function pickSavedCoupon(saved: SavedCoupon[], businessId: string, now = Date.now()): string | null {
  const usable = saved
    .map((s) => s.coupon)
    .filter((c) => c.is_active && (!c.ends_at || new Date(c.ends_at).getTime() > now))
    .filter((c) => c.business_id === null || c.business_id === businessId);
  return (usable.find((c) => c.business_id === businessId) ?? usable[0])?.code ?? null;
}

/**
 * Confirm Reservation: pre-applies a coupon saved on Offers, once, when the
 * draft has none. If the quote then rejects that auto-applied code (minimum
 * spend, listing not covered...), it is removed quietly, once.
 * `couponError` is the settled quote's error for the current code.
 */
export function useAutoApplyCoupon(draft: BookingDraft, couponError: string | null | undefined) {
  const saved = useSavedCoupons();
  const decided = useRef(false);
  const autoCode = useRef<string | null>(null);
  const { couponCode, item } = draft;

  useEffect(() => {
    if (decided.current) return;
    // The user already has a code (or this is a membership): never override it.
    if (couponCode || item.kind === 'membership') {
      decided.current = true;
      return;
    }
    if (!saved.data) return;
    decided.current = true;
    const code = pickSavedCoupon(saved.data, item.businessId);
    if (code) {
      autoCode.current = code;
      bookingDraft.update({ couponCode: code });
    }
  }, [couponCode, item.kind, item.businessId, saved.data]);

  useEffect(() => {
    if (autoCode.current && couponCode === autoCode.current && couponError) {
      autoCode.current = null;
      bookingDraft.update({ couponCode: null });
    }
  }, [couponCode, couponError]);
}
