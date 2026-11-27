import type { Metadata } from "next";
import { SecurityView } from "@/features/account/security-view";
import { getPortalContext } from "@/features/portal/context";

export const metadata: Metadata = { title: "Login & security" };

/** Figma 515:3295. */
export default async function SecurityPage() {
  const ctx = await getPortalContext();
  return <SecurityView me={await ctx.api.businessProfile.me(ctx.business.id)} timeZone={ctx.timeZone} />;
}
