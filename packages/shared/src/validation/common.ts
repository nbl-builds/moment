import { z } from 'zod';
import { LIMITS, MIN_SIGNUP_AGE } from '../constants';
import { ageOn, isValidLocalDate, toLocalDate } from '../format/datetime';
import { normalizePkPhone } from '../format/phone';

// Building blocks reused by the form schemas. Messages are user-facing copy.

// `guid` accepts any 8-4-4-4-12 hex id: Postgres uuid columns do not enforce the RFC variant (seed ids don't follow it).
export const uuidSchema = z.guid({ message: 'Invalid id' });

/** Trims, and turns "" into undefined so optional text fields can be left empty. */
export const optionalText = (max: number, label = 'This field') =>
  z
    .string()
    .trim()
    .max(max, { message: `${label} must be ${max} characters or less` })
    .optional()
    .transform((v) => (v ? v : undefined))
    .optional();

export const requiredText = (label: string, { min = 1, max }: { min?: number; max: number }) =>
  z
    .string({ message: `${label} is required` })
    .trim()
    .min(min, { message: min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters` })
    .max(max, { message: `${label} must be ${max} characters or less` });

export const emailSchema = z
  .string({ message: 'Email is required' })
  .trim()
  .min(1, { message: 'Email is required' })
  .toLowerCase()
  .pipe(z.email({ message: 'Enter a valid email address' }));

/** Pakistani mobile number in any common format; outputs E.164 (`+923001234567`). */
export const pkMobileSchema = z
  .string({ message: 'Phone number is required' })
  .trim()
  .min(1, { message: 'Phone number is required' })
  .transform((value, ctx) => {
    const e164 = normalizePkPhone(value);
    if (!e164) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid mobile number, e.g. 0300 1234567' });
      return z.NEVER;
    }
    return e164;
  });

/** Mobile or landline (business contact numbers); outputs E.164. */
export const pkPhoneSchema = z
  .string({ message: 'Phone number is required' })
  .trim()
  .min(1, { message: 'Phone number is required' })
  .transform((value, ctx) => {
    const e164 = normalizePkPhone(value, { allowLandline: true });
    if (!e164) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid Pakistani phone number' });
      return z.NEVER;
    }
    return e164;
  });

/** Optional phone: "" -> undefined, otherwise validated like `pkPhoneSchema`. */
export const optionalPkPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return undefined;
    const e164 = normalizePkPhone(value, { allowLandline: true });
    if (!e164) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid Pakistani phone number' });
      return z.NEVER;
    }
    return e164;
  })
  .optional();

export const passwordSchema = z
  .string({ message: 'Password is required' })
  .min(LIMITS.passwordMin, { message: `Use at least ${LIMITS.passwordMin} characters` })
  .max(LIMITS.passwordMax, { message: `Use ${LIMITS.passwordMax} characters or less` })
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), { message: 'Use at least one letter and one number' });

/** "YYYY-MM-DD" calendar date. */
/**
 * "YYYY-MM-DD" that exists on the calendar. Both checks abort, so refinements
 * chained after this (which parse the date) never see a malformed value.
 */
const requiredLocalDate = (requiredMessage: string) =>
  z
    .string({ message: requiredMessage })
    .min(1, { message: requiredMessage, abort: true })
    .refine(isValidLocalDate, { message: 'Enter a valid date', abort: true });

export const localDateSchema = requiredLocalDate('Date is required');

/** Local date that is today or later in Karachi (booking day pickers). */
export const futureLocalDateSchema = localDateSchema.refine((d) => d >= toLocalDate(Date.now()), {
  message: 'Pick today or a later date',
});

export const dateOfBirthSchema = requiredLocalDate('Date of birth is required')
  .refine((d) => d <= toLocalDate(Date.now()), { message: 'Date of birth cannot be in the future' })
  .refine((d) => ageOn(d) >= MIN_SIGNUP_AGE, { message: `You must be at least ${MIN_SIGNUP_AGE} to use Moment` })
  .refine((d) => ageOn(d) <= 120, { message: 'Enter a valid date of birth' });

export const isoDateTimeSchema = z.iso.datetime({ offset: true, message: 'Invalid date and time' });

export const personNameSchema = (label: string) =>
  requiredText(label, { max: LIMITS.personName }).refine((v) => /^[\p{L}\p{M}' .-]+$/u.test(v), {
    message: `${label} can only contain letters`,
  });

export const ratingSchema = z
  .number({ message: 'Pick a rating' })
  .int({ message: 'Pick a rating' })
  .min(1, { message: 'Pick a rating' })
  .max(5, { message: 'Pick a rating' });

export const urlSchema = z.url({ protocol: /^https?$/, message: 'Enter a valid link' });

/**
 * A stored media reference: an http(s) URL or a storage ref
 * (`storage://<bucket>/<path>`, resolved per client by `api.media.url`).
 */
export const mediaRefSchema = z.union([urlSchema, z.string().regex(/^storage:\/\/[a-z0-9-]+\/.+$/, 'Enter a valid link')]);
