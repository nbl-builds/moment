import { describe, expect, it } from 'vitest';
import {
  formatPkPhone,
  formatPkPhoneInput,
  isValidPkMobile,
  maskEmail,
  maskPhone,
  normalizePkPhone,
  pkPhoneKind,
} from './phone';

describe('normalizePkPhone', () => {
  it.each([
    '03001234567',
    '0300 1234567',
    '0300-1234567',
    '3001234567',
    '+923001234567',
    '+92 300 1234567',
    '+92 (300) 123-4567',
    '923001234567',
    '00923001234567',
  ])('normalises %s to E.164', (input) => {
    expect(normalizePkPhone(input)).toBe('+923001234567');
  });

  it('matches the database phone check', () => {
    const e164 = normalizePkPhone('0345 6789012');
    expect(e164).toMatch(/^\+[1-9][0-9]{7,14}$/);
  });

  it.each(['', '12345', '0300123456', '030012345678', '+14155552671', '+92 200 1234567', 'abc'])(
    'rejects %s as a mobile',
    (input) => {
      expect(normalizePkPhone(input)).toBeNull();
    },
  );

  it('accepts landlines only when asked', () => {
    expect(normalizePkPhone('051 1234567')).toBeNull();
    expect(normalizePkPhone('051 1234567', { allowLandline: true })).toBe('+92511234567');
    expect(normalizePkPhone('042 35761234', { allowLandline: true })).toBe('+924235761234');
    expect(normalizePkPhone('021-34567890', { allowLandline: true })).toBe('+922134567890');
  });

  it('classifies numbers', () => {
    expect(pkPhoneKind('03001234567')).toBe('mobile');
    expect(pkPhoneKind('0511234567')).toBe('landline');
    expect(pkPhoneKind('123')).toBeNull();
    expect(isValidPkMobile('0300 1234567')).toBe(true);
    expect(isValidPkMobile('051 1234567')).toBe(false);
  });
});

describe('formatPkPhone', () => {
  it('formats mobiles', () => {
    expect(formatPkPhone('+923001234567')).toBe('+92 300 1234567');
    expect(formatPkPhone('+923001234567', 'national')).toBe('0300 1234567');
  });

  it('formats landlines with 2- and 3-digit area codes', () => {
    expect(formatPkPhone('+92511234567')).toBe('+92 51 1234567');
    expect(formatPkPhone('+924235761234', 'national')).toBe('042 35761234');
    expect(formatPkPhone('+92946123456')).toBe('+92 946 123456');
  });

  it('returns unknown numbers unchanged', () => {
    expect(formatPkPhone('+14155552671')).toBe('+14155552671');
  });
});

describe('formatPkPhoneInput', () => {
  it('formats as you type after a fixed +92', () => {
    expect(formatPkPhoneInput('3')).toBe('3');
    expect(formatPkPhoneInput('300')).toBe('300');
    expect(formatPkPhoneInput('3001')).toBe('300 1');
    expect(formatPkPhoneInput('03001234567')).toBe('300 1234567');
    expect(formatPkPhoneInput('300123456789')).toBe('300 1234567');
  });
});

describe('masking', () => {
  it('masks phones like the Personal Information screen', () => {
    expect(maskPhone('+923084282001')).toBe('+92*******001');
    expect(maskPhone('03084282001', 4)).toBe('+92******2001');
  });

  it('masks emails', () => {
    expect(maskEmail('hamza.ahmed@gmail.com')).toBe('h*********d@gmail.com');
    expect(maskEmail('ab@moment.pk')).toBe('a*@moment.pk');
    expect(maskEmail('not-an-email')).toBe('not-an-email');
  });
});
