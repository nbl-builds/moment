import type { Metadata } from "next";
import { getPortalContext } from "@/features/portal/context";
import { ProfileView } from "@/features/account/profile-view";

export const metadata: Metadata = { title: "Profile" };

/** Avatar menu > Profile (Figma 629:7232) plus the Business section for owners and managers. */
export default async function ProfilePage() {
  const ctx = await getPortalContext();
  const [me, business] = await Promise.all([
    ctx.api.businessProfile.me(ctx.business.id),
    ctx.role === "staff" ? Promise.resolve(null) : ctx.api.businessProfile.business(ctx.business.id),
  ]);
  return <ProfileView me={me} business={business} businessId={ctx.business.id} role={ctx.role === "owner" ? "owner" : ctx.role === "manager" ? "manager" : "staff"} />;
}
