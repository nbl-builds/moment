import { describe, expect, it } from 'vitest';
import { ApiError, fromAuthError, fromPostgrestError, isApiError, unwrap, unwrapRequired } from './errors';

describe('fromPostgrestError', () => {
  it('maps RPC validation errors and keeps their message', () => {
    const error = fromPostgrestError({ code: '22023', message: 'Only 2 seats left in this slot' }, 400);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('invalid');
    expect(error.userMessage).toBe('Only 2 seats left in this slot');
    expect(error.sourceCode).toBe('22023');
  });

  it.each([
    ['P0002', 'not_found'],
    ['PGRST116', 'not_found'],
    ['23505', 'conflict'],
    ['23P01', 'conflict'],
    ['42501', 'forbidden'],
    ['PGRST301', 'unauthenticated'],
    ['XX000', 'unknown'],
  ] as const)('maps %s to %s', (sqlstate, code) => {
    expect(fromPostgrestError({ code: sqlstate, message: 'x' }).code).toBe(code);
  });

  it('hides constraint internals', () => {
    const error = fromPostgrestError({
      code: '23514',
      message: 'new row for relation "reviews" violates check constraint "reviews_rating_check"',
    });
    expect(error.message).toBe('Some details are not valid.');
  });

  it('shows friendly RPC permission errors but not raw RLS ones', () => {
    expect(fromPostgrestError({ code: '42501', message: 'You are not a member of this group' }).userMessage).toBe(
      'You are not a member of this group',
    );
    expect(
      fromPostgrestError({ code: '42501', message: 'new row violates row-level security policy for table "groups"' })
        .userMessage,
    ).toBe('You do not have access to this.');
  });

  it('falls back on HTTP status', () => {
    expect(fromPostgrestError({ message: 'Too many' }, 429).code).toBe('rate_limited');
    expect(fromPostgrestError({ message: 'TypeError: fetch failed' }).code).toBe('network');
  });
});

describe('fromAuthError', () => {
  it('maps Supabase Auth codes to friendly messages', () => {
    const error = fromAuthError({ code: 'otp_expired', status: 403, message: 'Token has expired or is invalid' });
    expect(error.code).toBe('invalid');
    expect(error.userMessage).toBe('Wrong or expired verification code.');
    expect(fromAuthError({ code: 'invalid_credentials', status: 400 }).userMessage).toBe('Incorrect email or password.');
    expect(fromAuthError({ code: 'over_sms_send_rate_limit', status: 429 }).code).toBe('rate_limited');
    expect(fromAuthError({ code: 'phone_provider_disabled', message: 'Phone logins are disabled' }).code).toBe('unsupported');
  });

  it('falls back on status', () => {
    expect(fromAuthError({ status: 429, message: 'slow down' }).code).toBe('rate_limited');
    expect(fromAuthError({ name: 'AuthRetryableFetchError', message: 'fetch failed' }).code).toBe('network');
  });
});

describe('unwrap', () => {
  it('returns data', async () => {
    await expect(unwrap(Promise.resolve({ data: [1, 2], error: null }))).resolves.toEqual([1, 2]);
  });

  it('throws ApiError on error', async () => {
    const promise = unwrap(Promise.resolve({ data: null, error: { code: 'P0002', message: 'Booking not found' }, status: 404 }));
    await expect(promise).rejects.toMatchObject({ code: 'not_found', message: 'Booking not found', status: 404 });
  });

  it('turns thrown fetch errors into network errors', async () => {
    const error = await unwrap(Promise.reject(new TypeError('fetch failed'))).catch((e: unknown) => e);
    expect(isApiError(error) && error.code).toBe('network');
  });

  it('unwrapRequired treats null as not found', async () => {
    await expect(unwrapRequired(Promise.resolve({ data: null, error: null }), 'Listing')).rejects.toMatchObject({
      code: 'not_found',
      message: 'Listing not found',
    });
  });
});
