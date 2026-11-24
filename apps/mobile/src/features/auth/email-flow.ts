import type { EmailSignInMethod } from '@moment/shared';
import * as Linking from 'expo-linking';
import { api } from '@/lib/api';
import { AUTH_BYPASS } from '@/lib/auth-bypass';
import { signInAsDevUser } from './otp';

// Email sign-in (Figma "Sign In Screens with Email" and "Forgot Screens"):
//   /sign-in-email -> 'password' -> /enter-password -> Home
//                  -> 'new'      -> /verify-code -> /create-password -> /finish-sign-up -> ...
//                  -> 'code'     -> /verify-code -> (as after any sign-in)
//   /enter-password -> "Forgot Password?" -> /forgot-password -> email link -> /reset-password
//
// With the dev auth bypass on, nothing is sent and every sign-in becomes the
// dev user; emails starting with "new" take the new-user path.

/** Which step follows the email. */
export async function emailSignInMethod(email: string): Promise<EmailSignInMethod> {
  if (AUTH_BYPASS) return email.startsWith('new') ? 'new' : 'password';
  return api.auth.emailSignInMethod(email);
}

/** Enter Password. Throws ApiError('invalid') for a wrong password. */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  if (AUTH_BYPASS) return signInAsDevUser();
  await api.auth.signInWithPassword({ email, password });
}

/** Create password / Set new password, for the signed-in user. */
export async function setPassword(password: string): Promise<void> {
  // The bypass signs in as the shared dev user: leave its password alone.
  if (AUTH_BYPASS) return;
  await api.auth.updatePassword(password);
}

/**
 * Where the reset email's link opens the app: moment://reset-password in a
 * build, exp://<host>/--/reset-password in Expo Go. Both are allowed in
 * supabase/config.toml (additional_redirect_urls).
 */
export const resetPasswordRedirect = (): string => Linking.createURL('reset-password');

/** Forgot Password: sends the reset email (nothing with the bypass on). */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  if (AUTH_BYPASS) return;
  await api.auth.sendPasswordReset(email, resetPasswordRedirect());
}
