import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PaymentsView } from "@/features/account/payments-view";
import { getPortalContext } from "@/features/portal/context";

export const metadata: Metadata = { title: "Payment method" };

/** Figma 515:3352. Owners only: managers and staff never see money. */
export default async function PaymentsPage() {
  const ctx = await getPortalContext();
  if (!ctx.permissions.withdraw) redirect("/business/settings");
  const [insights, accounts, payouts] = await Promise.all([
    ctx.api.portal.insights(ctx.business.id, "monthly"),
    ctx.api.businessProfile.payoutAccounts(ctx.business.id),
    ctx.api.businessProfile.payouts(ctx.business.id),
  ]);
  return <PaymentsView businessId={ctx.business.id} wallet={insights.wallet} accounts={accounts} payouts={payouts} timeZone={ctx.timeZone} />;
}
