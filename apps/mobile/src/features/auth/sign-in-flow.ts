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

/** A screen to come back to after signing in (e.g. Confirm Reservation), for 15 minutes. */
let returnTo: { href: Href; until: number } | null = null;
const RETURN_TTL_MS = 15 * 60_000;

/** Asked to sign in mid-task: land back on `href` (over Home) once signed in. Null clears it. */
export function returnAfterSignIn(href: Href | null): void {
  returnTo = href ? { href, until: Date.now() + RETURN_TTL_MS } : null;
}

const isHome = (href: Href) => href === '/home' || href === HOME_WITH_PERMISSIONS;

/**
 * Replaces the whole stack with `href`: once signed in, back must not return to
 * the code screen or onboarding. Going Home with a pending `returnAfterSignIn`
 * opens that screen over Home instead.
 */
export function resetTo(href: Href): void {
  if (router.canDismiss()) router.dismissAll();
  const back = returnTo && returnTo.until > Date.now() && isHome(href) ? returnTo.href : null;
  if (isHome(href)) returnTo = null;
  if (back) {
    router.replace('/home');
    router.push(back);
    return;
  }
  router.replace(href);
}
