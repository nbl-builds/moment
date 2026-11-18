import { z } from 'zod';
import { LIMITS } from '../constants';
import { emailSchema, optionalText, personNameSchema, pkMobileSchema } from './common';

// Figma: Profile > "Personal Information", notification settings.
// The database keeps one `profiles.display_name`; first and last name are
// joined with `toDisplayName`. Pronouns and emergency contact appear in the
// design but have no columns yet (see docs/ROADMAP.md).

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

export type PersonalInfoInput = z.input<typeof personalInfoSchema>;
export type PersonalInfo = z.output<typeof personalInfoSchema>;
export type NotificationPrefs = z.output<typeof notificationPrefsSchema>;
