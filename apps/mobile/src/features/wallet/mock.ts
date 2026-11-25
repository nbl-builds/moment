import type { PaymentMethodKey } from '@moment/shared';

// MOCK: wallet top-ups. Nothing is charged. Replace with the real deposit call
// (payment provider checkout + server-side wallet credit) when payments land.
// See docs/ROADMAP.md "To wire after UI".

export interface DepositInput {
  /** Minor units (Rs 1,000 = 100000). */
  amount: number;
  /** A saved payment method id, or a method key for a one-off payment. */
  method: { savedId: string; label: string } | { key: PaymentMethodKey; label: string };
}

export interface PendingDeposit {
  id: string;
  amount: number;
  currency: 'PKR';
  description: string;
  status: 'pending';
  created_at: string;
}

/** Starts a wallet deposit. The money shows up once the provider confirms it. */
export async function depositToWallet({ amount, method }: DepositInput): Promise<PendingDeposit> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return {
    id: `mock-deposit-${Date.now()}`,
    amount,
    currency: 'PKR',
    description: `Deposit from ${method.label}`,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
}
