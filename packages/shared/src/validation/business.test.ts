import { describe, expect, it } from 'vitest';
import { businessDetailsSchema, businessLoginSchema, loginIdentifierSchema } from './business';

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

const details = {
  name: 'Hunza Treks',
  address: 'House 12, Street 4, F-7/2',
  countryCode: 'PK',
  city: 'Islamabad',
  email: '',
  password: 'moment123',
  confirmPassword: 'moment123',
};

describe('login identifier', () => {
  it('accepts an email or a Pakistani mobile', () => {
    expect(loginIdentifierSchema.parse(' Owner@Example.PK ')).toEqual({ kind: 'email', email: 'owner@example.pk' });
    expect(loginIdentifierSchema.parse('0300 1234567')).toEqual({ kind: 'phone', phone: '+923001234567' });
    expect(loginIdentifierSchema.parse('+92 308 4282001')).toEqual({ kind: 'phone', phone: '+923084282001' });
  });

  it('explains what is wrong', () => {
    expect(firstError(loginIdentifierSchema.safeParse(''))).toBe('Enter your email or phone number');
    expect(firstError(loginIdentifierSchema.safeParse('owner@'))).toBe('Enter a valid email address');
    expect(firstError(loginIdentifierSchema.safeParse('12345'))).toBe(
      'Enter a valid email or mobile number, e.g. 0300 1234567',
    );
  });

  it('needs a password to log in', () => {
    expect(firstError(businessLoginSchema.safeParse({ identifier: '03001234567', password: '' }))).toBe(
      'Enter your password',
    );
  });
});

describe('business details', () => {
  it('accepts a complete form and drops an empty email', () => {
    const parsed = businessDetailsSchema.parse(details);
    expect(parsed.email).toBeUndefined();
    expect(parsed.city).toBe('Islamabad');
  });

  it('checks the email when given', () => {
    expect(firstError(businessDetailsSchema.safeParse({ ...details, email: 'nope' }))).toBe('Enter a valid email address');
    expect(businessDetailsSchema.parse({ ...details, email: 'Treks@Example.pk' }).email).toBe('treks@example.pk');
  });

  it('only offers launch cities and Pakistan', () => {
    expect(firstError(businessDetailsSchema.safeParse({ ...details, city: 'Peshawar' }))).toBe('Select your city');
    expect(firstError(businessDetailsSchema.safeParse({ ...details, countryCode: '' }))).toBe('Select your country');
  });

  it('uses the shared password rules and matching confirmation', () => {
    expect(firstError(businessDetailsSchema.safeParse({ ...details, password: 'short1', confirmPassword: 'short1' }))).toBe(
      'Use at least 8 characters',
    );
    expect(
      firstError(businessDetailsSchema.safeParse({ ...details, password: 'lettersonly', confirmPassword: 'lettersonly' })),
    ).toBe('Use at least one letter and one number');
    expect(firstError(businessDetailsSchema.safeParse({ ...details, confirmPassword: 'moment124' }))).toBe(
      'Passwords do not match',
    );
  });

  it('requires name and address', () => {
    expect(firstError(businessDetailsSchema.safeParse({ ...details, name: ' ' }))).toBe('Name is required');
    expect(firstError(businessDetailsSchema.safeParse({ ...details, address: 'x' }))).toBe(
      'Address must be at least 5 characters',
    );
  });
});
