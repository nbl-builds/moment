// Mocks for Profile until these have a backend (docs/ROADMAP.md, "To wire after
// UI"). Same signatures the real calls will have; swap each for an `api.*` call.

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type VerificationStatus = 'none' | 'in_review' | 'verified';

let verification: VerificationStatus = 'none';

/** Where the user's identity check stands. MOCK: kept in memory for this app session. */
export async function getVerificationStatus(): Promise<VerificationStatus> {
  await wait(150);
  return verification;
}

/**
 * Identity Verification > Submit: CNIC front, CNIC back and a selfie (local
 * file URIs). MOCK: nothing is uploaded; the status becomes "in_review". Real:
 * upload to a private `identity-documents` bucket, create a review row, and set
 * `profiles.identity_verified_at` when the Moment team approves it.
 */
export async function submitIdentityVerification(_args: { cnicFrontUri: string; cnicBackUri: string; selfieUri: string }) {
  await wait(800);
  verification = 'in_review';
  return { reference: `IDV-${Date.now().toString(36).toUpperCase()}`, files: 3, status: verification };
}

/**
 * Delete Account. MOCK: nothing is deleted. Real: an edge function that records
 * the request, signs the user out everywhere and deletes the auth user after a
 * 30-day grace period (bookings and payments are kept for tax records).
 */
export async function requestAccountDeletion(_args: { reason?: string }) {
  await wait(700);
  return { reference: `DEL-${Date.now().toString(36).toUpperCase()}`, deleteAfterDays: 30 };
}

/** Privacy > Deactivate account. MOCK: nothing changes. Real: hide the profile and pause notifications until next sign in. */
export async function deactivateAccount() {
  await wait(600);
  return { deactivated: true };
}

/** Privacy > Download my data. MOCK: nothing is generated. Real: an edge function emails a ZIP link within 48 hours. */
export async function requestDataExport() {
  await wait(600);
  return { reference: `EXP-${Date.now().toString(36).toUpperCase()}`, readyWithinHours: 48 };
}
