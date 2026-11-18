import { z } from 'zod';
import { OTP_LENGTH, PASSCODE_LENGTH } from '../constants';
import {
  dateOfBirthSchema,
  emailSchema,
  passwordSchema,
  personNameSchema,
  pkMobileSchema,
} from './common';

// Figma: "Sign in / Up with phone", "Sign Up with email", "Sign in with email",
// "Sign In OTP", "Enter Password", "Forgot Password", "Sign Up Finishing",
// "Passcode & Face ID".

/** Sign in / Up with phone. `phone` comes out as E.164. */
export const phoneSignInSchema = z.object({ phone: pkMobileSchema });

/** Sign in / Sign up with email (first step: we send a code or ask for a password). */
export const emailSignInSchema = z.object({ email: emailSchema });

export const otpCodeSchema = z
  .string({ message: 'Enter the verification code' })
  .trim()
  .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), { message: `Enter the ${OTP_LENGTH}-digit code` });

/** Sign In OTP, after a phone number. */
export const verifyPhoneOtpSchema = z.object({ phone: pkMobileSchema, code: otpCodeSchema });

/** Sign In OTP, after an email. */
export const verifyEmailOtpSchema = z.object({ email: emailSchema, code: otpCodeSchema });

/** Enter Password. Only checks presence: the server decides if it is right. */
export const passwordSignInSchema = z.object({
  email: emailSchema,
  password: z.string({ message: 'Enter your password' }).min(1, { message: 'Enter your password' }),
});

/** Forgot Password / Reset Password: "Enter your registered email". */
export const forgotPasswordSchema = z.object({ email: emailSchema });

/** Choosing a new password from the reset link. */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const completeSignUpBase = z.object({
  firstName: personNameSchema('First name'),
  lastName: personNameSchema('Last name'),
  email: emailSchema,
  dateOfBirth: dateOfBirthSchema,
  /** "I don't want to receive marketing messages from Moment." */
  marketingOptOut: z.boolean().default(false),
  /** "By selecting Agree and continue, I agree to Moment Terms of Service, and Privacy Policy." */
  acceptTerms: z.literal(true, { message: 'Please accept the Terms of Service and Privacy Policy' }),
});

/** Sign Up Finishing after phone or email OTP (no password). */
export const completeSignUpSchema = completeSignUpBase;

/** Sign Up Finishing for email sign-up with a password. */
export const completeSignUpWithPasswordSchema = completeSignUpBase.extend({ password: passwordSchema });

const passcodeDigits = z
  .string({ message: 'Enter a passcode' })
  .regex(new RegExp(`^\\d{${PASSCODE_LENGTH}}$`), { message: `Enter ${PASSCODE_LENGTH} digits` });

/** Rejects passcodes that are trivially guessable: all one digit, or a straight run (123456, 654321). */
export function isWeakPasscode(code: string): boolean {
  if (/^(\d)\1+$/.test(code)) return true;
  const digits = [...code].map(Number);
  const steps = digits.slice(1).map((d, i) => d - (digits[i] ?? 0));
  return steps.every((s) => s === 1) || steps.every((s) => s === -1);
}

/** Unlocking with a passcode. */
export const passcodeSchema = z.object({ passcode: passcodeDigits });

/** Passcode & Face ID setup: choose and confirm. */
export const setupPasscodeSchema = z
  .object({
    passcode: passcodeDigits.refine((v) => !isWeakPasscode(v), { message: 'Choose a harder passcode' }),
    confirmPasscode: z.string(),
    enableBiometrics: z.boolean().default(false),
  })
  .refine((v) => v.passcode === v.confirmPasscode, {
    message: 'Passcodes do not match',
    path: ['confirmPasscode'],
  });

export type PhoneSignInInput = z.input<typeof phoneSignInSchema>;
export type PhoneSignIn = z.output<typeof phoneSignInSchema>;
export type EmailSignIn = z.output<typeof emailSignInSchema>;
export type VerifyPhoneOtp = z.output<typeof verifyPhoneOtpSchema>;
export type VerifyEmailOtp = z.output<typeof verifyEmailOtpSchema>;
export type PasswordSignIn = z.output<typeof passwordSignInSchema>;
export type ForgotPassword = z.output<typeof forgotPasswordSchema>;
export type ResetPassword = z.output<typeof resetPasswordSchema>;
export type CompleteSignUpInput = z.input<typeof completeSignUpWithPasswordSchema>;
export type CompleteSignUp = z.output<typeof completeSignUpSchema>;
export type CompleteSignUpWithPassword = z.output<typeof completeSignUpWithPasswordSchema>;
export type SetupPasscode = z.output<typeof setupPasscodeSchema>;
