import { describe, expect, it } from 'vitest';
import { formatHour, priceBreakdown, refundNote } from './booking';

describe('priceBreakdown', () => {
  it('adds tax on the discounted amount and the service fee', () => {
    expect(priceBreakdown(1_000_000, 100_000)).toEqual({ subtotal: 1_000_000, discount: 100_000, tax: 144_000, serviceFee: 15_000, total: 1_059_000 });
    expect(priceBreakdown(0).total).toBe(0);
  });
});

describe('refundNote', () => {
  // A 4 PM (PKT) session on 28 Nov 2026 = 11:00Z.
  const start = '2026-11-28T11:00:00Z';
  it('gives the free-cancellation deadline in PKT', () => {
    expect(refundNote('flexible', start, undefined, '2026-11-20T00:00:00Z')).toBe(
      'Free cancellation before 4 PM on 27 Nov (PKT). After that, non-refundable.',
    );
    expect(refundNote('moderate', start, undefined, '2026-11-20T00:00:00Z')).toContain('25 Nov');
  });
  it('says when the window has passed or never existed', () => {
    expect(refundNote('flexible', start, undefined, '2026-11-28T00:00:00Z')).toMatch(/^Non-refundable/);
    expect(refundNote('non_refundable', start)).toBe('Non-refundable once booked.');
  });
});

describe('formatHour', () => {
  it('formats in Karachi time', () => {
    expect(formatHour('2026-11-28T11:00:00Z')).toBe('4 PM');
    expect(formatHour('2026-11-28T05:30:00Z')).toBe('10:30 AM');
  });
});
