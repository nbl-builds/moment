import { router, type Href } from 'expo-router';
import { api } from '@/lib/api';
import { isBiometricSignInEnabled } from './biometrics';

// Phone sign up (Figma "Sign Up / Screens with phone"):
//   login sheet -> /verify-code -> /finish-sign-up (new users only)
//   -> /face-id -> /home, where the location and notification sheets show.

/** Home, asking for location and notification permission on arrival. */
export const HOME_WITH_PERMISSIONS: Href = { pathname: '/home', params: { permissions: '1' } };

/** After "Finish signing up" (or straight after the code, for returning users). */
export async function routeAfterProfile(): Promise<Href> {
  // Face ID is set up per device, so a returning user on a new phone is asked again.
  return (await isBiometricSignInEnabled()) ? HOME_WITH_PERMISSIONS : '/face-id';
}

/** Where to go once the verification code is accepted. */
export async function routeAfterSignIn(): Promise<Href> {
  return (await api.auth.needsSignUp()) ? '/finish-sign-up' : routeAfterProfile();
}

/**
 * Replaces the whole stack with `href`: once signed in, back must not return to
 * the code screen or onboarding.
 */
export function resetTo(href: Href): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace(href);
}
