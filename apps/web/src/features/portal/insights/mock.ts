// Withdraw (Insights > Wallet Amount). Payouts aren't wired yet: no payout
// provider or payout account exists. Same signature the real API will have
// (a `payouts` row with status pending, created by the backend); swap for
// `api.portal.requestPayout` when it lands. Listed in docs/ROADMAP.md.

export interface WithdrawalRequest {
  id: string;
  businessId: string;
  amount: number;
  currency: string;
  status: "pending";
  requestedAt: string;
}

export async function requestWithdrawal(businessId: string, amount: number, currency: string): Promise<WithdrawalRequest> {
  await new Promise((r) => setTimeout(r, 600));
  return {
    id: `TEST-${Date.now().toString(36).toUpperCase()}`,
    businessId,
    amount,
    currency,
    status: "pending",
    requestedAt: new Date().toISOString(),
  };
}
