// Mocks for Profile and Account Settings until these have a backend
// (docs/ROADMAP.md, "To wire after UI"). Same signatures the real calls will
// have; swap each for an `api.*` call.

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type VerificationStatus = "none" | "in_review" | "verified";
let verification: VerificationStatus = "none";

/** Where the person's identity check stands. MOCK: kept in memory for this browser session. */
export async function getVerificationStatus(): Promise<VerificationStatus> {
  await wait(100);
  return verification;
}

/**
 * Identity verification > Submit: CNIC front, CNIC back and a selfie. MOCK:
 * nothing is uploaded; the status becomes "in_review". Real (same as mobile):
 * upload to a private `identity-documents` bucket, create a review row, and set
 * `profiles.identity_verified_at` when the Moment team approves it.
 */
export async function submitIdentityVerification(args: { cnicFront: File; cnicBack: File; selfie: File }) {
  await wait(800);
  verification = "in_review";
  const files = [args.cnicFront, args.cnicBack, args.selfie].filter(Boolean).length;
  return { reference: `IDV-${Date.now().toString(36).toUpperCase()}`, files, status: verification };
}

export type PayoutProvider = "bank_transfer" | "jazzcash" | "easypaisa";

export interface PayoutAccountInput {
  provider: PayoutProvider;
  accountTitle: string;
  /** Bank transfer. */
  bankName?: string;
  iban?: string;
  /** JazzCash / Easypaisa mobile account (E.164). */
  mobile?: string;
}

export interface SavedPayoutAccount {
  id: string;
  provider: PayoutProvider;
  account_title: string;
  bank_name: string | null;
  account_number_last4: string | null;
  iban_masked: string | null;
  is_default: boolean;
  verified_at: string | null;
  created_at: string;
}

const added: SavedPayoutAccount[] = [];

/**
 * Add Payment Method (payout account). MOCK: kept in memory for this browser
 * session. Real: the payment provider tokenises the account; only the
 * provider ref, title, bank and masked number are stored in `payout_accounts`.
 */
export async function savePayoutAccount(input: PayoutAccountInput): Promise<SavedPayoutAccount> {
  await wait(600);
  const digits = (input.iban ?? input.mobile ?? "").replace(/\D/g, "");
  const account: SavedPayoutAccount = {
    id: `mock-${Date.now().toString(36)}`,
    provider: input.provider,
    account_title: input.accountTitle,
    bank_name: input.provider === "bank_transfer" ? (input.bankName ?? null) : input.provider === "jazzcash" ? "JazzCash" : "Easypaisa",
    account_number_last4: digits.slice(-4) || null,
    iban_masked: input.iban ? `${input.iban.slice(0, 4)} •••• •••• ${input.iban.slice(-4)}` : null,
    is_default: added.length === 0,
    verified_at: null,
    created_at: new Date().toISOString(),
  };
  added.push(account);
  return account;
}

/** Accounts added in this session (MOCK). */
export async function mockPayoutAccounts(): Promise<SavedPayoutAccount[]> {
  await wait(50);
  return [...added];
}

export interface DeviceSession {
  id: string;
  label: string;
  place: string;
  lastActive: string;
}

/**
 * Device history: sessions on other devices. MOCK: a fixed list (Supabase
 * doesn't expose a user's sessions to the client). The current session is real
 * and "Log out of other devices" really ends the others (signOut scope others).
 */
export async function otherDevices(): Promise<DeviceSession[]> {
  await wait(100);
  const day = 86_400_000;
  const now = Date.now();
  return [
    { id: "mock-iphone", label: "iPhone 15 · Moment app", place: "Lahore, Punjab", lastActive: new Date(now - 2 * day).toISOString() },
    { id: "mock-chrome", label: "Chrome on Windows", place: "Islamabad", lastActive: new Date(now - 9 * day).toISOString() },
  ];
}
