import { z } from 'zod';
import { LIMITS } from '../constants';
import { emailSchema, optionalText, personNameSchema, pkMobileSchema } from './common';

// Figma: Profile > "Personal Information", notification settings.
// The database keeps one public `profiles.display_name` (first and last name
// joined with `toDisplayName`) plus private first / last name, pronouns and
// emergency contact in `profile_private`.

export const personalInfoSchema = z.object({
  firstName: personNameSchema('First name'),
  lastName: personNameSchema('Last name'),
  bio: optionalText(LIMITS.bio, 'Bio'),
  homeCity: optionalText(80, 'City'),
});

export const toDisplayName = (firstName: string, lastName: string): string =>
  `${firstName.trim()} ${lastName.trim()}`.trim().slice(0, LIMITS.displayName);

/** Splits a stored display name back into first and last for the edit form. */
export function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] ?? '' };
}

/** Email > Edit. Supabase sends a confirmation to the new address. */
export const changeEmailSchema = z.object({ email: emailSchema });

/** Phone Number > Edit. Supabase sends an OTP to the new number. */
export const changePhoneSchema = z.object({ phone: pkMobileSchema });

/** Matches the `profile_private.notification_prefs` JSON. */
export const notificationPrefsSchema = z.object({
  push: z.boolean(),
  email: z.boolean(),
  sms: z.boolean(),
  marketing: z.boolean(),
});

/** Pronouns picker on Edit personal info. */
export const PRONOUNS = ['she/her', 'he/him', 'they/them', 'she/they', 'he/they'] as const;

/** Edit personal info > Save. */
export const personalDetailsSchema = z.object({
  firstName: personNameSchema('First name'),
  lastName: personNameSchema('Last name'),
  pronouns: z.string().trim().max(30).optional().transform((v) => (v ? v : undefined)),
});

/** Emergency contact sheet (Edit personal info > Add). Phone is stored as +92... */
export const emergencyContactSchema = z.object({
  name: personNameSchema('Name'),
  relation: z.string().trim().min(1, { message: 'Add how you know them' }).max(40, { message: 'Keep it under 40 characters' }),
  phone: pkMobileSchema,
});

/** Privacy & Sharing toggles; matches `profile_private.privacy_prefs`. */
export const privacyPrefsSchema = z.object({
  profile_public: z.boolean(),
  likes_visible_to_groups: z.boolean(),
  bookings_visible_to_hosts: z.boolean(),
});

/** Payment method > Add: a card or a mobile wallet number. Only display details are stored. */
export const addCardSchema = z.object({
  holderName: personNameSchema('Name on card'),
  number: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length >= 13 && v.length <= 19 && luhn(v), { message: 'Check the card number' }),
  expiry: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Use MM/YY' })
    .refine((v) => {
      const [m, y] = v.split('/').map(Number) as [number, number];
      const now = new Date();
      const year = 2000 + y;
      return year > now.getFullYear() || (year === now.getFullYear() && m >= now.getMonth() + 1);
    }, { message: 'This card has expired' }),
  cvc: z.string().trim().regex(/^\d{3,4}$/, { message: '3 or 4 digits' }),
});
export const addWalletSchema = z.object({ phone: pkMobileSchema });

function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Card brand from the first digits, for the saved card label. */
export function cardBrand(number: string): string {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^(60|65|81|82)/.test(n)) return 'UnionPay';
  return 'Card';
}

export type PersonalDetails = z.output<typeof personalDetailsSchema>;
export type EmergencyContact = z.output<typeof emergencyContactSchema>;
export type PrivacyPrefs = z.output<typeof privacyPrefsSchema>;
export type AddCard = z.output<typeof addCardSchema>;

export type PersonalInfoInput = z.input<typeof personalInfoSchema>;
export type PersonalInfo = z.output<typeof personalInfoSchema>;
export type NotificationPrefs = z.output<typeof notificationPrefsSchema>;
