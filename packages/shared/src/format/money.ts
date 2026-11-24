import { DEFAULT_CURRENCY } from '../constants';

// Money is stored as integers in minor units (PKR 4,500 = 450000).
// These helpers are the only place that converts between minor units and display.

/** ISO 4217 minor-unit exponents for currencies we may show. Defaults to 2. */
const MINOR_UNIT_DIGITS: Record<string, number> = {
  PKR: 2,
  USD: 2,
  AED: 2,
  SAR: 2,
  GBP: 2,
  EUR: 2,
  JPY: 0,
  KWD: 3,
  BHD: 3,
  OMR: 3,
};

const SYMBOLS: Record<string, string> = {
  PKR: 'Rs',
  USD: '$',
  GBP: '£',
  EUR: '€',
};

export const minorUnitDigits = (currency: string = DEFAULT_CURRENCY): number =>
  MINOR_UNIT_DIGITS[currency.toUpperCase()] ?? 2;

/** 4500 (major) -> 450000 (minor). Rounds to the nearest minor unit. */
export function toMinorUnits(major: number, currency: string = DEFAULT_CURRENCY): number {
  if (!Number.isFinite(major)) throw new RangeError(`Invalid amount: ${major}`);
  const factor = 10 ** minorUnitDigits(currency);
  // toFixed first so 1.005 * 100 (= 100.49999...) rounds to 101, not 100.
  return Math.round(Number((major * factor).toFixed(6)));
}

/** 450000 (minor) -> 4500 (major). */
export function fromMinorUnits(minor: number, currency: string = DEFAULT_CURRENCY): number {
  return minor / 10 ** minorUnitDigits(currency);
}

const groupThousands = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export interface FormatPriceOptions {
  currency?: string;
  /** `symbol` -> "Rs 4,500", `code` -> "PKR 4,500", `none` -> "4,500". Default `symbol`. */
  display?: 'symbol' | 'code' | 'none';
  /** `auto` shows decimals only when the amount has a fractional part. Default `auto`. */
  decimals?: 'auto' | 'always' | 'never';
  /** Compact large amounts: "Rs 1.2M", "Rs 45K". Default false. */
  compact?: boolean;
}

/**
 * Formats a minor-unit amount for display. Deterministic (no Intl), so the same
 * string renders on Hermes, browsers and the server.
 *
 * formatPrice(450000)                     -> "Rs 4,500"
 * formatPrice(450050)                     -> "Rs 4,500.50"
 * formatPrice(450000, { display: 'code' }) -> "PKR 4,500"
 * formatPrice(125000000, { compact: true }) -> "Rs 1.25M"
 */
export function formatPrice(amountMinor: number, options: FormatPriceOptions = {}): string {
  const { currency = DEFAULT_CURRENCY, display = 'symbol', decimals = 'auto', compact = false } = options;
  if (!Number.isFinite(amountMinor)) throw new RangeError(`Invalid amount: ${amountMinor}`);

  const code = currency.toUpperCase();
  const digits = minorUnitDigits(code);
  const negative = amountMinor < 0;
  const absMinor = Math.abs(Math.round(amountMinor));

  let body: string;
  if (compact && absMinor >= 1000 * 10 ** digits) {
    body = compactNumber(absMinor / 10 ** digits);
  } else {
    const factor = 10 ** digits;
    const whole = Math.floor(absMinor / factor);
    const fraction = absMinor % factor;
    const showFraction = digits > 0 && (decimals === 'always' || (decimals === 'auto' && fraction !== 0));
    let wholeOut = whole;
    let fractionOut = '';
    if (showFraction) {
      fractionOut = `.${String(fraction).padStart(digits, '0')}`;
    } else if (decimals === 'never' && fraction * 2 >= factor) {
      wholeOut += 1; // round half up when hiding decimals
    }
    body = groupThousands(String(wholeOut)) + fractionOut;
  }

  return `${negative ? '-' : ''}${currencyPrefix(code, display)}${body}`;
}

function currencyPrefix(code: string, display: FormatPriceOptions['display']): string {
  if (display === 'none') return '';
  const symbol = SYMBOLS[code];
  if (display === 'code' || !symbol) return `${code} `;
  // Single-glyph symbols sit flush ("$45"); word symbols get a space ("Rs 4,500").
  return symbol.length === 1 ? symbol : `${symbol} `;
}

function compactNumber(major: number): string {
  const units: [number, string][] = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (major >= size) {
      const value = Math.floor((major / size) * 100) / 100; // truncate, never overstate
      return `${String(value)}${suffix}`;
    }
  }
  return String(major);
}

export type PriceUnit = 'per_person' | 'per_booking';

const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  per_person: 'per person',
  per_booking: 'per booking',
};

/** "per person" / "per booking", for cards that show the unit under the price. */
export function priceUnitLabel(unit: PriceUnit): string {
  return PRICE_UNIT_LABELS[unit];
}

/** "Rs 4,500 per person" for listing cards. */
export function formatListingPrice(
  amountMinor: number,
  unit: PriceUnit,
  options: FormatPriceOptions = {},
): string {
  return `${formatPrice(amountMinor, options)} ${PRICE_UNIT_LABELS[unit]}`;
}

/** "Rs 2,000 - Rs 4,500"; collapses to one price when both ends match. */
export function formatPriceRange(minMinor: number, maxMinor: number, options: FormatPriceOptions = {}): string {
  if (minMinor === maxMinor) return formatPrice(minMinor, options);
  return `${formatPrice(minMinor, options)} - ${formatPrice(maxMinor, options)}`;
}

/**
 * Parses what a business types into a price field ("4,500", "Rs 4500.5") into minor units.
 * Returns null for anything that is not a non-negative amount with at most the currency's decimals.
 */
export function parsePriceInput(input: string, currency: string = DEFAULT_CURRENCY): number | null {
  const digits = minorUnitDigits(currency);
  const cleaned = input
    .trim()
    .replace(/^(rs\.?|pkr|\$|£|€)\s*/i, '')
    .replace(/[,\s]/g, '');
  const pattern = digits > 0 ? new RegExp(`^\\d+(\\.\\d{1,${digits}})?$`) : /^\d+$/;
  if (!pattern.test(cleaned)) return null;
  return toMinorUnits(Number(cleaned), currency);
}
