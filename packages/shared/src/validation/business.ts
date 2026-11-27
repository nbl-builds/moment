import { z } from 'zod';
import { COUNTRY_CODE, LAUNCH_CITIES, LIMITS } from '../constants';
import { normalizePkPhone } from '../format/phone';
import { emailSchema, passwordSchema, requiredText, uuidSchema } from './common';

/** Empty -> "is required", then the minimum length. */
const textAtLeast = (label: string, min: number, max: number) =>
  requiredText(label, { max }).refine((v) => v.length >= min, {
    message: `${label} must be at least ${min} characters`,
  });

// Business portal sign up and login (Figma "Moment Business App", auth frames).
// Sign up itself reuses `phoneSignInSchema` / `emailSignInSchema` and the OTP
// schemas from ./auth.

/** "Email Address / Phone Number": an email, or a Pakistani mobile in any common format. */
export const loginIdentifierSchema = z
  .string({ message: 'Enter your email or phone number' })
  .trim()
  .min(1, { message: 'Enter your email or phone number' })
  .transform((value, ctx): { kind: 'email'; email: string } | { kind: 'phone'; phone: string } => {
    if (value.includes('@')) {
      const email = emailSchema.safeParse(value);
      if (email.success) return { kind: 'email', email: email.data };
      ctx.addIssue({ code: 'custom', message: 'Enter a valid email address' });
      return z.NEVER;
    }
    const phone = normalizePkPhone(value);
    if (phone) return { kind: 'phone', phone };
    ctx.addIssue({ code: 'custom', message: 'Enter a valid email or mobile number, e.g. 0300 1234567' });
    return z.NEVER;
  });

export type LoginIdentifier = z.output<typeof loginIdentifierSchema>;

/** Login: email or phone + password. Only checks presence of the password. */
export const businessLoginSchema = z.object({
  identifier: loginIdentifierSchema,
  password: z.string({ message: 'Enter your password' }).min(1, { message: 'Enter your password' }),
});

/** Forgot password: email (reset link) or phone (code, then a new password). */
export const businessForgotPasswordSchema = z.object({ identifier: loginIdentifierSchema });

/** "Tell us about yourself". */
export const businessSignUpTypes = ['host', 'business'] as const;
export type BusinessSignUpType = (typeof businessSignUpTypes)[number];

const businessDetailsFields = {
  name: textAtLeast('Name', 2, LIMITS.businessName),
  address: textAtLeast('Address', 5, LIMITS.businessAddress),
  countryCode: z.literal(COUNTRY_CODE, { message: 'Select your country' }),
  city: z.enum(LAUNCH_CITIES, { message: 'Select your city' }),
  /** Optional in the phone flow, prefilled and locked in the email flow. */
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(emailSchema.optional()),
};

/**
 * "We need some more details to continue..." with password + confirm, so the
 * account can always log in with email / phone + password.
 */
export const businessDetailsSchema = z
  .object({
    ...businessDetailsFields,
    password: passwordSchema,
    confirmPassword: z.string({ message: 'Confirm your password' }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/** The same form for accounts that already have a password (signed in with it). */
export const businessDetailsNoPasswordSchema = z.object(businessDetailsFields);

export type BusinessDetailsInput = z.input<typeof businessDetailsSchema>;
export type BusinessDetails = z.output<typeof businessDetailsSchema>;
export type BusinessDetailsNoPassword = z.output<typeof businessDetailsNoPasswordSchema>;

/** Everything `api.business.createBusiness` needs. */
export const createBusinessSchema = z.object({
  type: z.enum(businessSignUpTypes),
  categoryId: uuidSchema,
  name: textAtLeast('Name', 2, LIMITS.businessName),
  address: textAtLeast('Address', 5, LIMITS.businessAddress),
  countryCode: z.literal(COUNTRY_CODE),
  city: z.enum(LAUNCH_CITIES),
  email: emailSchema.optional(),
  phone: z.string().optional(),
});

export type CreateBusiness = z.output<typeof createBusinessSchema>;
