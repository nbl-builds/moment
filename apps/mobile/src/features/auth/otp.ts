import { ApiError } from '@moment/shared';
import { api } from '@/lib/api';
import { AUTH_BYPASS, BYPASS_WRONG_CODE, DEV_USER_CODE, DEV_USER_PHONE } from '@/lib/auth-bypass';

/** Where the one-time code goes: a phone (E.164) or an email. */
export type OtpTarget = { phone: string; email?: undefined } | { email: string; phone?: undefined };

/** Sends a sign-in code. With the dev auth bypass on, nothing is sent to `target`. */
export async function sendCode(target: OtpTarget): Promise<void> {
  if (AUTH_BYPASS) {
    // Makes sure the dev user exists; its number is a test_otp number, so no SMS goes out.
    await api.auth.sendPhoneOtp(DEV_USER_PHONE);
    return;
  }
  if (target.email !== undefined) await api.auth.sendEmailOtp(target.email);
  else await api.auth.sendPhoneOtp(target.phone);
}

/**
 * Checks the code and signs in. Throws ApiError('invalid') for a wrong code.
 * With the dev auth bypass on, any 6 digits sign in as the dev user, except
 * 000000, which is "wrong".
 */
export async function verifyCode(target: OtpTarget, code: string): Promise<void> {
  if (AUTH_BYPASS) {
    if (code === BYPASS_WRONG_CODE) throw new ApiError('invalid', 'Wrong or expired verification code.');
    await signInAsDevUser();
    return;
  }
  if (target.email !== undefined) await api.auth.verifyEmailOtp({ email: target.email, code });
  else await api.auth.verifyPhoneOtp({ phone: target.phone, code });
}

/**
 * Dev auth bypass: signs in as the fixed local dev user. Its number is a
 * test_otp number, so the send and the fixed code never reach an SMS provider.
 */
export async function signInAsDevUser(): Promise<void> {
  try {
    // Creates the dev user on a fresh database; nothing is actually sent.
    await api.auth.sendPhoneOtp(DEV_USER_PHONE);
  } catch (e) {
    // Sent a moment ago (e.g. by the code screen): the user exists, carry on.
    if (!(e instanceof ApiError && e.code === 'rate_limited')) throw e;
  }
  await api.auth.verifyPhoneOtp({ phone: DEV_USER_PHONE, code: DEV_USER_CODE });
}
