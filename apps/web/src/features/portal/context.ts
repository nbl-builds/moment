import "server-only";
import type { Enums } from "@moment/shared";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { businessRoutes } from "@/config/site";
import { createServerApi } from "@/lib/api/server";

/** Cookie with the business the team member is working in (several memberships). */
export const ACTIVE_BUSINESS_COOKIE = "moment_business";

export type PortalRole = Enums<"business_role">;

/** What a role may do in the portal. Staff and managers never see money. */
export function permissionsFor(role: PortalRole) {
  return {
    seeRevenue: role === "owner",
    seeWallet: role === "owner",
    withdraw: role === "owner",
    editListings: role === "owner" || role === "manager",
    manageReservations: true,
    replyToReviews: role === "owner" || role === "manager",
  };
}
export type PortalPermissions = ReturnType<typeof permissionsFor>;

/**
 * Signed-in team member, their memberships and the active business. Cached per
 * request. Redirects to login / onboarding (the proxy normally already has).
 */
export const getPortalContext = cache(async () => {
  const api = await createServerApi();
  const user = await api.auth.getUser();
  if (!user) redirect(businessRoutes.login);

  const [memberships, profile] = await Promise.all([
    api.business.listMyBusinesses(),
    api.db.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle(),
  ]);
  if (!memberships.length) redirect(businessRoutes.onboardingType);

  const wanted = (await cookies()).get(ACTIVE_BUSINESS_COOKIE)?.value;
  const active = memberships.find((m) => m.business.id === wanted) ?? memberships[0]!;
  const displayName = profile.data?.display_name ?? user.email ?? "there";

  return {
    api,
    user,
    memberships,
    business: active.business,
    role: active.role as PortalRole,
    permissions: permissionsFor(active.role as PortalRole),
    timeZone: active.business.timezone,
    displayName,
    firstName: displayName.split(" ")[0] ?? displayName,
    avatarUrl: api.media.url(profile.data?.avatar_url ?? null),
  };
});

export type PortalContext = Awaited<ReturnType<typeof getPortalContext>>;
