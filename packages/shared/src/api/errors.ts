import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';

export type MomentSupabaseClient = SupabaseClient<Database>;

export type ApiErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'invalid'
  | 'conflict'
  | 'rate_limited'
  | 'network'
  | 'unsupported'
  | 'unknown';

/**
 * The one error type the API client throws. `message` is safe to show to users
 * when `code` is `invalid`, `not_found` or `conflict`: those come from the
 * `raise exception` messages in our RPCs ("Only 2 seats left in this slot").
 */
export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    readonly code: ApiErrorCode,
    message: string,
    /** Postgres SQLSTATE, PostgREST code or Supabase Auth error code. */
    readonly sourceCode?: string,
    readonly status?: number,
    /** The underlying Supabase / fetch error. */
    readonly original?: unknown,
  ) {
    super(message);
  }

  /** Message for a toast or inline error. Falls back to generic copy for internal errors. */
  get userMessage(): string {
    switch (this.code) {
      case 'invalid':
      case 'not_found':
      case 'conflict':
      case 'unsupported':
        return this.message;
      case 'unauthenticated':
        return 'Please sign in to continue.';
      case 'forbidden':
        // RPCs raise friendly 42501s ("You are not a member of this group"); RLS errors are internal.
        return /permission denied|row-level security/i.test(this.message) ? 'You do not have access to this.' : this.message;
      case 'rate_limited':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'network':
        return 'Cannot reach Moment. Check your connection and try again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}

export const isApiError = (value: unknown): value is ApiError => value instanceof ApiError;

// Postgres SQLSTATEs raised by our RPCs and constraints, plus PostgREST codes.
const SQLSTATE_CODES: Record<string, ApiErrorCode> = {
  P0002: 'not_found', // raise ... using errcode = 'P0002'
  PGRST116: 'not_found', // .single() matched no rows
  '22023': 'invalid', // invalid_parameter_value, our validation errors
  '22P02': 'invalid', // invalid_text_representation (bad uuid etc.)
  '23502': 'invalid', // not_null_violation
  '23514': 'invalid', // check_violation
  '23503': 'invalid', // foreign_key_violation
  '23505': 'conflict', // unique_violation
  '23P01': 'conflict', // exclusion_violation (appointment double-booking)
  '42501': 'forbidden', // insufficient_privilege / RLS
  PGRST301: 'unauthenticated', // JWT expired or invalid
  PGRST302: 'unauthenticated',
};

const FRIENDLY_CONSTRAINT_MESSAGES: Record<string, string> = {
  '23505': 'This already exists.',
  '23514': 'Some details are not valid.',
  '23503': 'Something this refers to no longer exists.',
  '23502': 'A required field is missing.',
  '22P02': 'Some details are not valid.',
};

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

interface AuthLikeError {
  name?: string;
  message?: string;
  status?: number;
  code?: string;
}

/** Converts a PostgREST / Postgres error into an ApiError. */
export function fromPostgrestError(error: PostgrestLikeError, status?: number): ApiError {
  const sqlstate = error.code ?? '';
  let code: ApiErrorCode = SQLSTATE_CODES[sqlstate] ?? 'unknown';
  if (code === 'unknown' && status === 401) code = 'unauthenticated';
  if (code === 'unknown' && status === 429) code = 'rate_limited';
  if (code === 'unknown' && !sqlstate && /fetch|network/i.test(error.message ?? '')) code = 'network';
  // Constraint violations carry internal names ("violates check constraint ...").
  const message =
    FRIENDLY_CONSTRAINT_MESSAGES[sqlstate] && /constraint|violates|invalid input syntax/i.test(error.message ?? '')
      ? (FRIENDLY_CONSTRAINT_MESSAGES[sqlstate] ?? '')
      : error.message || 'Request failed';
  return new ApiError(code, message, sqlstate || undefined, status, error);
}

const AUTH_CODES: Record<string, ApiErrorCode> = {
  invalid_credentials: 'invalid',
  otp_expired: 'invalid',
  otp_disabled: 'unsupported',
  phone_provider_disabled: 'unsupported',
  email_provider_disabled: 'unsupported',
  provider_disabled: 'unsupported',
  validation_failed: 'invalid',
  weak_password: 'invalid',
  same_password: 'invalid',
  email_exists: 'conflict',
  phone_exists: 'conflict',
  user_already_exists: 'conflict',
  email_address_invalid: 'invalid',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
  over_sms_send_rate_limit: 'rate_limited',
  session_not_found: 'unauthenticated',
  session_expired: 'unauthenticated',
  refresh_token_not_found: 'unauthenticated',
  user_not_found: 'not_found',
};

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Incorrect email or password.',
  otp_expired: 'Wrong or expired verification code.',
  weak_password: 'Choose a stronger password.',
  same_password: 'Choose a password you have not used before.',
  email_exists: 'An account with this email already exists.',
  phone_exists: 'An account with this phone number already exists.',
  user_already_exists: 'An account already exists. Sign in instead.',
  email_address_invalid: 'Enter a valid email address.',
};

/** Converts a Supabase Auth error into an ApiError. */
export function fromAuthError(error: AuthLikeError): ApiError {
  const authCode = error.code ?? '';
  let code: ApiErrorCode = AUTH_CODES[authCode] ?? 'unknown';
  if (code === 'unknown') {
    if (error.status === 429) code = 'rate_limited';
    else if (error.status === 401 || error.status === 403) code = 'unauthenticated';
    else if (error.status === 400 || error.status === 422) code = 'invalid';
    else if (error.name === 'AuthRetryableFetchError') code = 'network';
  }
  return new ApiError(code, AUTH_MESSAGES[authCode] ?? error.message ?? 'Authentication failed', authCode || undefined, error.status, error);
}

interface QueryResult {
  data: unknown;
  error: PostgrestLikeError | null;
  status?: number;
}

/** The success branch of a Supabase response union (`{ data: T; error: null }`). */
type SuccessData<R extends QueryResult> = Extract<R, { error: null }>['data'];

/** Awaits a Supabase query and returns its data, throwing ApiError on failure. */
export async function unwrap<R extends QueryResult>(query: PromiseLike<R>): Promise<SuccessData<R>> {
  let result: R;
  try {
    result = await query;
  } catch (cause) {
    throw new ApiError('network', 'Network request failed', undefined, undefined, cause);
  }
  if (result.error) throw fromPostgrestError(result.error, result.status);
  return result.data as SuccessData<R>;
}

/** Like `unwrap`, but a missing row (`maybeSingle()` returning null) is a `not_found` error. */
export async function unwrapRequired<R extends QueryResult>(
  query: PromiseLike<R>,
  what = 'Item',
): Promise<NonNullable<SuccessData<R>>> {
  const data = await unwrap(query);
  if (data === null || data === undefined) throw new ApiError('not_found', `${what} not found`, 'PGRST116', 404);
  return data as NonNullable<SuccessData<R>>;
}

/** The signed-in user's id from the local session. RLS still enforces access on the server. */
export async function requireUserId(db: MomentSupabaseClient): Promise<string> {
  const { data, error } = await db.auth.getSession();
  if (error) throw fromAuthError(error);
  const id = data.session?.user.id;
  if (!id) throw new ApiError('unauthenticated', 'Sign in to continue', undefined, 401);
  return id;
}
