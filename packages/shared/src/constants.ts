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
