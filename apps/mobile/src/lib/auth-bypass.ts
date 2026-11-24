/**
 * Dev-only auth bypass, for testing screens without an SMS or email provider.
 *
 * On only when EXPO_PUBLIC_AUTH_BYPASS=1 in apps/mobile/.env.local AND this is a
 * development bundle (`__DEV__`). Release builds compile `__DEV__` to false, so
 * this is always off there, whatever the env file says.
 */
export const AUTH_BYPASS: boolean = __DEV__ && process.env.EXPO_PUBLIC_AUTH_BYPASS === '1';

/**
 * The fixed local dev user every bypassed sign-in becomes. It is a test_otp
 * number in supabase/config.toml, so Supabase accepts its fixed code and never
 * sends an SMS. Finish signing up saves to this user's rows.
 */
export const DEV_USER_PHONE = '+923001234567';
export const DEV_USER_CODE = '123456';

/** Entering this code shows "Wrong verification code" while bypassing. */
export const BYPASS_WRONG_CODE = '000000';
