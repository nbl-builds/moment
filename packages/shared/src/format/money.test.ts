import { describe, expect, it } from 'vitest';
import {
  formatListingPrice,
  formatPrice,
  formatPriceRange,
  fromMinorUnits,
  parsePriceInput,
  toMinorUnits,
} from './money';

describe('minor units', () => {
  it('converts PKR both ways', () => {
    expect(toMinorUnits(4500)).toBe(450000);
    expect(fromMinorUnits(450000)).toBe(4500);
    expect(toMinorUnits(4500.5)).toBe(450050);
  });

  it('avoids float rounding errors', () => {
    expect(toMinorUnits(1.005)).toBe(101);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
    expect(toMinorUnits(19.99)).toBe(1999);
  });

  it('respects currencies with other exponents', () => {
    expect(toMinorUnits(500, 'JPY')).toBe(500);
    expect(toMinorUnits(1.234, 'KWD')).toBe(1234);
  });

  it('rejects non-finite amounts', () => {
    expect(() => toMinorUnits(Number.NaN)).toThrow(RangeError);
  });
});

describe('formatPrice', () => {
  it('formats PKR with the Rs symbol and thousands separators', () => {
    expect(formatPrice(450000)).toBe('Rs 4,500');
    expect(formatPrice(125000000)).toBe('Rs 1,250,000');
    expect(formatPrice(0)).toBe('Rs 0');
  });

  it('shows decimals only when needed by default', () => {
    expect(formatPrice(450050)).toBe('Rs 4,500.50');
    expect(formatPrice(450005)).toBe('Rs 4,500.05');
    expect(formatPrice(450000, { decimals: 'always' })).toBe('Rs 4,500.00');
  });

  it('rounds half up when decimals are hidden', () => {
    expect(formatPrice(450050, { decimals: 'never' })).toBe('Rs 4,501');
    expect(formatPrice(450049, { decimals: 'never' })).toBe('Rs 4,500');
  });

  it('supports code and bare display', () => {
    expect(formatPrice(450000, { display: 'code' })).toBe('PKR 4,500');
    expect(formatPrice(450000, { display: 'none' })).toBe('4,500');
  });

  it('handles other currencies', () => {
    expect(formatPrice(5000, { currency: 'USD' })).toBe('$50');
    expect(formatPrice(5000, { currency: 'AED' })).toBe('AED 50');
    expect(formatPrice(5000, { currency: 'usd', display: 'code' })).toBe('USD 50');
  });

  it('formats negatives (refunds, wallet debits)', () => {
    expect(formatPrice(-250000)).toBe('-Rs 2,500');
  });

  it('compacts large amounts without overstating', () => {
    expect(formatPrice(125000000, { compact: true })).toBe('Rs 1.25M');
    expect(formatPrice(4599900, { compact: true })).toBe('Rs 45.99K');
    expect(formatPrice(99900, { compact: true })).toBe('Rs 999');
  });
});

describe('listing prices', () => {
  it('adds the price unit', () => {
    expect(formatListingPrice(450000, 'per_person')).toBe('Rs 4,500 per person');
    expect(formatListingPrice(1200000, 'per_booking')).toBe('Rs 12,000 per booking');
  });

  it('formats ranges', () => {
    expect(formatPriceRange(200000, 450000)).toBe('Rs 2,000 - Rs 4,500');
    expect(formatPriceRange(200000, 200000)).toBe('Rs 2,000');
  });
});

describe('parsePriceInput', () => {
  it('parses what businesses type', () => {
    expect(parsePriceInput('4500')).toBe(450000);
    expect(parsePriceInput('4,500')).toBe(450000);
    expect(parsePriceInput(' Rs 4,500.5 ')).toBe(450050);
    expect(parsePriceInput('PKR 12,000')).toBe(1200000);
    expect(parsePriceInput('Rs.250')).toBe(25000);
  });

  it('rejects invalid input', () => {
    expect(parsePriceInput('')).toBeNull();
    expect(parsePriceInput('-10')).toBeNull();
    expect(parsePriceInput('4.555')).toBeNull();
    expect(parsePriceInput('abc')).toBeNull();
    expect(parsePriceInput('1.5', 'JPY')).toBeNull();
  });
});
