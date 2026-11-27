import type { Metadata } from "next";
import { PersonalView } from "@/features/account/personal-view";
import { getPortalContext } from "@/features/portal/context";

export const metadata: Metadata = { title: "Personal information" };

/** Figma 515:3218. */
export default async function PersonalPage() {
  const ctx = await getPortalContext();
  return <PersonalView me={await ctx.api.businessProfile.me(ctx.business.id)} />;
}
