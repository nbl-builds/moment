import { describe, expect, it } from 'vitest';
import { addCardSchema, addWalletSchema, cardBrand, emergencyContactSchema, personalDetailsSchema } from './profile';

describe('personal details', () => {
  it('keeps pronouns optional', () => {
    expect(personalDetailsSchema.parse({ firstName: 'Ali', lastName: 'Raza', pronouns: '' })).toEqual({ firstName: 'Ali', lastName: 'Raza', pronouns: undefined });
    expect(personalDetailsSchema.parse({ firstName: 'Ali', lastName: 'Raza', pronouns: 'he/him' }).pronouns).toBe('he/him');
  });
  it('requires names', () => {
    expect(personalDetailsSchema.safeParse({ firstName: '', lastName: 'Raza' }).success).toBe(false);
  });
});

describe('emergency contact', () => {
  it('stores the phone as +92', () => {
    expect(emergencyContactSchema.parse({ name: 'Sara Raza', relation: 'Sister', phone: '0333 1234567' }).phone).toBe('+923331234567');
  });
  it('needs a relation', () => {
    expect(emergencyContactSchema.safeParse({ name: 'Sara', relation: '', phone: '03331234567' }).success).toBe(false);
  });
});

describe('payment methods', () => {
  const next = new Date().getFullYear() + 1 - 2000;
  it('accepts a valid card', () => {
    const card = addCardSchema.parse({ holderName: 'Ali Raza', number: '4242 4242 4242 4242', expiry: `08/${next}`, cvc: '123' });
    expect(card.number).toBe('4242424242424242');
  });
  it('rejects a bad checksum, expired card and short CVC', () => {
    expect(addCardSchema.safeParse({ holderName: 'Ali', number: '4242 4242 4242 4241', expiry: `08/${next}`, cvc: '123' }).error?.issues[0]?.message).toBe('Check the card number');
    expect(addCardSchema.safeParse({ holderName: 'Ali', number: '4242424242424242', expiry: '01/20', cvc: '123' }).error?.issues[0]?.message).toBe('This card has expired');
    expect(addCardSchema.safeParse({ holderName: 'Ali', number: '4242424242424242', expiry: `08/${next}`, cvc: '12' }).success).toBe(false);
  });
  it('names the brand', () => {
    expect(cardBrand('4242')).toBe('Visa');
    expect(cardBrand('5555 5555')).toBe('Mastercard');
    expect(cardBrand('2221 00')).toBe('Mastercard');
    expect(cardBrand('9999')).toBe('Card');
  });
  it('takes a Pakistani mobile wallet number', () => {
    expect(addWalletSchema.parse({ phone: '0300 1234567' }).phone).toBe('+923001234567');
    expect(addWalletSchema.safeParse({ phone: '12345' }).success).toBe(false);
  });
});
