import { describe, expect, it } from 'vitest';
import { addDaysToLocalDate, toLocalDate } from '../format/datetime';
import {
  completeSignUpSchema,
  completeSignUpWithPasswordSchema,
  emailSignInSchema,
  forgotPasswordSchema,
  isWeakPasscode,
  passwordSignInSchema,
  phoneSignInSchema,
  resetPasswordSchema,
  setupPasscodeSchema,
  verifyEmailOtpSchema,
  verifyPhoneOtpSchema,
} from './auth';

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe('phone and email sign in', () => {
  it('normalises the phone to E.164', () => {
    expect(phoneSignInSchema.parse({ phone: '0308 4282001' })).toEqual({ phone: '+923084282001' });
  });

  it('rejects bad phones with friendly copy', () => {
    const result = phoneSignInSchema.safeParse({ phone: '12345' });
    expect(firstError(result)).toBe('Enter a valid mobile number, e.g. 0300 1234567');
    expect(firstError(phoneSignInSchema.safeParse({ phone: '' }))).toBe('Phone number is required');
  });

  it('trims and lowercases emails', () => {
    expect(emailSignInSchema.parse({ email: '  Nabeel@Moment.COM ' })).toEqual({ email: 'nabeel@moment.com' });
    expect(firstError(emailSignInSchema.safeParse({ email: 'nope' }))).toBe('Enter a valid email address');
    expect(firstError(forgotPasswordSchema.safeParse({ email: '' }))).toBe('Email is required');
  });
});

describe('OTP', () => {
  it('accepts a 6-digit code', () => {
    expect(verifyPhoneOtpSchema.parse({ phone: '03084282001', code: ' 051801 ' })).toEqual({
      phone: '+923084282001',
      code: '051801',
    });
    expect(verifyEmailOtpSchema.safeParse({ email: 'a@b.pk', code: '123456' }).success).toBe(true);
  });

  it.each(['12345', '1234567', '12a456', ''])('rejects %j', (code) => {
    expect(verifyEmailOtpSchema.safeParse({ email: 'a@b.pk', code }).success).toBe(false);
  });
});

describe('passwords', () => {
  it('only checks presence on sign in', () => {
    expect(passwordSignInSchema.safeParse({ email: 'a@b.pk', password: 'x' }).success).toBe(true);
    expect(firstError(passwordSignInSchema.safeParse({ email: 'a@b.pk', password: '' }))).toBe('Enter your password');
  });

  it('enforces strength and matching on reset', () => {
    expect(resetPasswordSchema.safeParse({ password: 'moment2026', confirmPassword: 'moment2026' }).success).toBe(true);
    expect(firstError(resetPasswordSchema.safeParse({ password: 'short1', confirmPassword: 'short1' }))).toBe(
      'Use at least 8 characters',
    );
    expect(firstError(resetPasswordSchema.safeParse({ password: 'onlyletters', confirmPassword: 'onlyletters' }))).toBe(
      'Use at least one letter and one number',
    );
    const mismatch = resetPasswordSchema.safeParse({ password: 'moment2026', confirmPassword: 'moment2027' });
    expect(mismatch.error?.issues[0]).toMatchObject({ path: ['confirmPassword'], message: 'Passwords do not match' });
  });
});

describe('Sign Up Finishing', () => {
  const valid = {
    firstName: ' Nabeel ',
    lastName: 'Ahmed',
    email: 'nabeel@moment.pk',
    dateOfBirth: '1995-08-14',
    acceptTerms: true as const,
  };

  it('parses a complete form and defaults the marketing choice', () => {
    expect(completeSignUpSchema.parse(valid)).toEqual({
      ...valid,
      firstName: 'Nabeel',
      marketingOptOut: false,
    });
  });

  it('requires accepting the terms', () => {
    const result = completeSignUpSchema.safeParse({ ...valid, acceptTerms: false });
    expect(firstError(result)).toBe('Please accept the Terms of Service and Privacy Policy');
  });

  it('checks names', () => {
    expect(completeSignUpSchema.safeParse({ ...valid, firstName: "Zainab-Bibi O'Neil" }).success).toBe(true);
    expect(completeSignUpSchema.safeParse({ ...valid, firstName: 'عائشہ' }).success).toBe(true);
    expect(firstError(completeSignUpSchema.safeParse({ ...valid, firstName: '' }))).toBe('First name is required');
    expect(firstError(completeSignUpSchema.safeParse({ ...valid, lastName: 'R2D2' }))).toBe(
      'Last name can only contain letters',
    );
  });

  it('checks date of birth', () => {
    const today = toLocalDate(Date.now());
    const twelveYearsAgo = `${Number(today.slice(0, 4)) - 12}${today.slice(4)}`;
    expect(firstError(completeSignUpSchema.safeParse({ ...valid, dateOfBirth: twelveYearsAgo }))).toBe(
      'You must be at least 13 to use Moment',
    );
    expect(firstError(completeSignUpSchema.safeParse({ ...valid, dateOfBirth: addDaysToLocalDate(today, 1) }))).toBe(
      'Date of birth cannot be in the future',
    );
    expect(firstError(completeSignUpSchema.safeParse({ ...valid, dateOfBirth: '1995-02-30' }))).toBe('Enter a valid date');
  });

  it('requires a strong password on the password variant', () => {
    expect(completeSignUpWithPasswordSchema.safeParse({ ...valid, password: 'moment2026' }).success).toBe(true);
    expect(completeSignUpWithPasswordSchema.safeParse(valid).success).toBe(false);
  });
});

describe('Passcode & Face ID', () => {
  it('flags weak passcodes', () => {
    expect(isWeakPasscode('000000')).toBe(true);
    expect(isWeakPasscode('123456')).toBe(true);
    expect(isWeakPasscode('987654')).toBe(true);
    expect(isWeakPasscode('482915')).toBe(false);
  });

  it('requires matching, non-trivial passcodes', () => {
    expect(setupPasscodeSchema.parse({ passcode: '482915', confirmPasscode: '482915' })).toEqual({
      passcode: '482915',
      confirmPasscode: '482915',
      enableBiometrics: false,
    });
    expect(firstError(setupPasscodeSchema.safeParse({ passcode: '111111', confirmPasscode: '111111' }))).toBe(
      'Choose a harder passcode',
    );
    expect(firstError(setupPasscodeSchema.safeParse({ passcode: '4829', confirmPasscode: '4829' }))).toBe('Enter 6 digits');
    expect(firstError(setupPasscodeSchema.safeParse({ passcode: '482915', confirmPasscode: '482916' }))).toBe(
      'Passcodes do not match',
    );
  });
});
