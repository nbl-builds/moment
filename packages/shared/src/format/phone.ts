// Pakistani phone numbers. The database stores E.164 (`+923001234567`, see the
// `^\+[1-9][0-9]{7,14}$` checks); these helpers turn what people type into that
// and back into something readable.
//
// Mobile numbers: 03XX XXXXXXX nationally, +92 3XX XXXXXXX internationally.
// Landlines: area code + subscriber, e.g. 051 1234567 (Islamabad), 042 35761234 (Lahore).

/** National significant number (no 0 / +92) for a mobile: 3 followed by 9 digits. */
const MOBILE_NSN = /^3\d{9}$/;
/** Landlines: area codes start 2 and 4-9; 9 or 10 digits total. */
const LANDLINE_NSN = /^[24-9]\d{8,9}$/;

/** Two-digit area codes (big cities). Everything else uses three digits. */
const TWO_DIGIT_AREA_CODES = new Set(['21', '22', '41', '42', '51', '52', '53', '55', '61', '71', '81', '91']);

export type PkPhoneKind = 'mobile' | 'landline';

export interface NormalizeOptions {
  /** Accept landlines as well as mobiles (business contact numbers). Default false. */
  allowLandline?: boolean;
}

/** Strips formatting and the country/trunk prefix. Returns digits only, or null if it is not a +92 number. */
function toNationalNumber(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (hasPlus) return digits.startsWith('92') ? digits.slice(2) : null;
  if (digits.startsWith('0092')) return digits.slice(4);
  if (digits.startsWith('92') && digits.length >= 11) return digits.slice(2);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function pkPhoneKind(input: string): PkPhoneKind | null {
  const nsn = toNationalNumber(input);
  if (!nsn) return null;
  if (MOBILE_NSN.test(nsn)) return 'mobile';
  if (LANDLINE_NSN.test(nsn)) return 'landline';
  return null;
}

/**
 * Normalises any common way of writing a Pakistani number to E.164.
 *
 * normalizePkPhone('0300 1234567')   -> '+923001234567'
 * normalizePkPhone('+92 300-1234567') -> '+923001234567'
 * normalizePkPhone('3001234567')     -> '+923001234567'
 * normalizePkPhone('051 1234567', { allowLandline: true }) -> '+92511234567'
 * normalizePkPhone('12345')          -> null
 */
export function normalizePkPhone(input: string, options: NormalizeOptions = {}): string | null {
  const nsn = toNationalNumber(input);
  if (!nsn) return null;
  const kind = pkPhoneKind(nsn);
  if (kind === 'mobile' || (kind === 'landline' && options.allowLandline)) return `+92${nsn}`;
  return null;
}

export const isValidPkMobile = (input: string): boolean => normalizePkPhone(input) !== null;

function splitNsn(nsn: string): [string, string] {
  if (MOBILE_NSN.test(nsn)) return [nsn.slice(0, 3), nsn.slice(3)];
  const areaLength = TWO_DIGIT_AREA_CODES.has(nsn.slice(0, 2)) ? 2 : 3;
  return [nsn.slice(0, areaLength), nsn.slice(areaLength)];
}

/**
 * Formats a stored number for display. Returns the input unchanged if it is not
 * a recognisable Pakistani number (e.g. a foreign number), so it is always safe to call.
 *
 * formatPkPhone('+923001234567')               -> '+92 300 1234567'
 * formatPkPhone('+923001234567', 'national')   -> '0300 1234567'
 * formatPkPhone('+92511234567')                -> '+92 51 1234567'
 */
export function formatPkPhone(input: string, style: 'international' | 'national' = 'international'): string {
  const e164 = normalizePkPhone(input, { allowLandline: true });
  if (!e164) return input;
  const [prefix, rest] = splitNsn(e164.slice(3));
  return style === 'national' ? `0${prefix} ${rest}` : `+92 ${prefix} ${rest}`;
}

/**
 * Formats digits as the user types into a field with a fixed "+92" prefix:
 * formatPkPhoneInput('3001') -> '300 1', formatPkPhoneInput('03001234567') -> '300 1234567'.
 * Keeps at most 10 digits.
 */
export function formatPkPhoneInput(input: string): string {
  const nsn = (toNationalNumber(input) ?? input.replace(/\D/g, '')).slice(0, 10);
  return nsn.length > 3 ? `${nsn.slice(0, 3)} ${nsn.slice(3)}` : nsn;
}

/** "+92*********001", as on the Personal Information screen. */
export function maskPhone(input: string, visibleDigits = 3): string {
  const e164 = normalizePkPhone(input, { allowLandline: true });
  if (!e164) return input;
  const nsn = e164.slice(3);
  return `+92${'*'.repeat(Math.max(nsn.length - visibleDigits, 0))}${nsn.slice(-visibleDigits)}`;
}

/** "h*****d@gmail.com", as on the Personal Information screen. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return `${local[0]}*${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}${domain}`;
}
