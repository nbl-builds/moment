// Mocks for the Booking Flow until payments and memberships have a backend
// (see docs/ROADMAP.md, "To wire after UI"). Same signatures as the real calls.

import type { PaymentMethodKey } from '@moment/shared';
export type { PaymentMethodKey };

export interface PaymentResult {
  status: 'pending' | 'succeeded';
  /** Test reference, as a provider would return. */
  reference: string;
  amount: number;
  method: PaymentMethodKey;
}

/**
 * Pay for bookings that `create_booking` / `create_bookings` already made.
 * MOCK: no provider is chosen yet (Pakistan: JazzCash, Easypaisa, Safepay...),
 * so this records nothing and returns a pending test payment. The booking
 * keeps `payment_status = 'unpaid'`. Replace with the payment provider call;
 * the server then marks the booking paid by webhook.
 */
export async function payForBookings(args: { bookingIds: string[]; amount: number; method: PaymentMethodKey }): Promise<PaymentResult> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return {
    status: 'pending',
    reference: `TEST-${Date.now().toString(36).toUpperCase()}`,
    amount: args.amount,
    method: args.method,
  };
}

/**
 * "Apply Membership": paid memberships are created by backend code after
 * payment (docs/DATABASE.md). MOCK: returns a pending request; nothing is
 * stored. Replace with the membership checkout endpoint.
 */
export async function applyForMembership(args: { planId: string; method: PaymentMethodKey; amount: number }) {
  const payment = await payForBookings({ bookingIds: [], amount: args.amount, method: args.method });
  return { planId: args.planId, status: 'pending' as const, payment };
}
