// Carries the phone number or email from "Sign Up" / "Forgot password" to the
// verification page. sessionStorage, so it survives a refresh but not a new tab,
// and nothing personal ends up in the URL.

export type PendingVerification =
  | { method: "phone"; phone: string; purpose: "signup" | "recovery" }
  | { method: "email"; email: string; purpose: "signup" };

const KEY = "moment.business.verify";

export function savePendingVerification(value: PendingVerification) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...value, sentAt: Date.now() }));
  } catch {
    // Private mode without storage: the verify page sends people back to sign up.
  }
}

export function readPendingVerification(): (PendingVerification & { sentAt: number }) | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingVerification & { sentAt: number }) : null;
  } catch {
    return null;
  }
}

export function markResent() {
  const current = readPendingVerification();
  if (current) savePendingVerification(current);
}

export function clearPendingVerification() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
