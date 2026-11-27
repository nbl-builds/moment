import type { Metadata } from "next";
import { getPortalContext } from "@/features/portal/context";
import { InsightsView } from "@/features/portal/insights/insights-view";

export const metadata: Metadata = { title: "Insights" };

/** Figma 127:456 (top) and 512:2143 (full page). Revenue and wallet are for owners only. */
export default async function InsightsPage() {
  const ctx = await getPortalContext();
  const [insights, counts] = await Promise.all([
    ctx.api.portal.insights(ctx.business.id, "weekly"),
    ctx.api.portal.reservationCounts(ctx.business.id, { timeZone: ctx.timeZone }),
  ]);
  return (
    <InsightsView
      businessId={ctx.business.id}
      timeZone={ctx.timeZone}
      currency={ctx.business.currency}
      initial={insights}
      counts={counts}
      canSeeMoney={ctx.permissions.seeRevenue}
    />
  );
}
