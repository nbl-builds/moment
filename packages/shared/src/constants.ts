// Launch-market defaults and limits shared by every client.
// Limits mirror the CHECK constraints in supabase/migrations so forms fail
// before the database does. Change both together.

export const DEFAULT_CURRENCY = 'PKR';
export const DEFAULT_TIMEZONE = 'Asia/Karachi';
export const DEFAULT_LOCALE = 'en-PK';
export const COUNTRY_CODE = 'PK';
export const COUNTRY_CALLING_CODE = '+92';

export const LAUNCH_CITIES = ['Islamabad', 'Lahore', 'Karachi'] as const;
export type LaunchCity = (typeof LAUNCH_CITIES)[number];

/** Digits in a Supabase phone/email OTP (`otp_length` in supabase/config.toml, 6 boxes in Figma). */
export const OTP_LENGTH = 6;
/** On-device passcode length (6 digits, confirmed). Stored in secure storage only, never in the database. */
export const PASSCODE_LENGTH = 6;
/** Minimum age to create an account (Figma: adults are 13+). */
export const MIN_SIGNUP_AGE = 13;

export const LIMITS = {
  displayName: 80,
  bio: 500,
  personName: 40,
  passwordMin: 8,
  passwordMax: 72, // bcrypt limit used by Supabase Auth
  bookingNotes: 1000,
  cancellationReason: 500,
  couponCode: { min: 3, max: 32 },
  reviewBody: 2000,
  reviewPhotos: 6,
  reviewReply: 1000,
  bucketListNote: 500,
  bucketListName: 60,
  recommendationName: { min: 2, max: 140 },
  recommendationNote: 1000,
  groupName: { min: 2, max: 80 },
  groupDescription: 1000,
  groupMembers: { min: 2, max: 100 },
  messageBody: 4000,
  supportSubject: { min: 3, max: 140 },
  supportBody: 4000,
  searchQuery: 100,
} as const;

/**
 * How customers can pay, shown on Membership Details and at checkout. One list
 * for every client; the payment providers themselves are chosen later (see
 * docs/DATABASE.md, payments).
 */
export const PAYMENT_METHODS = [
  { key: 'card', label: 'Card' },
  { key: 'jazzcash', label: 'JazzCash' },
  { key: 'easypaisa', label: 'Easypaisa' },
] as const;
export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number]['key'];

/**
 * Charges added on Confirm Reservation on top of the server's subtotal.
 * Placeholder rates until finance confirms them (Figma shows 2.5% and $2):
 * sales tax on services and a flat Moment service fee per checkout.
 */
export const BOOKING_CHARGES = {
  taxPercent: 16,
  serviceFeeAmount: 15000, // Rs 150, minor units
} as const;

/**
 * What each `listings.cancellation_policy` means for the guest. Shown as the
 * refund note on "Select dates" and in Confirm Reservation.
 */
export const CANCELLATION_POLICIES = {
  flexible: { freeUntilHours: 24, label: 'Flexible', summary: 'Full refund up to 24 hours before the start.' },
  moderate: { freeUntilHours: 72, label: 'Moderate', summary: 'Full refund up to 3 days before the start.' },
  strict: { freeUntilHours: 7 * 24, label: 'Strict', summary: 'Full refund up to 7 days before the start.' },
  non_refundable: { freeUntilHours: null, label: 'Non-refundable', summary: 'Non-refundable once booked.' },
} as const;
export type CancellationPolicyKey = keyof typeof CANCELLATION_POLICIES;
