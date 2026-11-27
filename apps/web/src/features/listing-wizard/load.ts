import "server-only";
import { toLocalDate } from "@moment/shared";
import { notFound, redirect } from "next/navigation";
import { getPortalContext } from "@/features/portal/context";
import type { WizardData } from "./state";

/** Everything the wizard needs for one business (and one listing when editing). */
export async function loadWizard(listingId: string | null): Promise<{ data: WizardData; today: string }> {
  const ctx = await getPortalContext();
  // Staff see listings read-only (Listing Details); only owners and managers edit.
  if (!ctx.permissions.editListings) redirect(listingId ? `/business/listings/${listingId}` : "/business/listings");
  const { api, business, user } = ctx;

  const [listing, categories, staff, hostCard, profile, commissionBps, businessHours, primary] = await Promise.all([
    listingId ? api.listingEditor.get(listingId).catch(() => null) : Promise.resolve(null),
    api.db
      .from("categories")
      .select("id, slug, name, description, is_group, parent_id, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    api.listingEditor.listStaff(business.id),
    api.listingEditor.myHostCard(business.id),
    api.db.from("profiles").select("display_name, avatar_url, bio").eq("id", user.id).maybeSingle(),
    api.listingEditor.commissionBps().catch(() => 1000),
    api.listingEditor.businessHours(business.id),
    api.db.from("businesses").select("primary_category:categories(slug)").eq("id", business.id).maybeSingle(),
  ]);
  if (listingId && (!listing || listing.business_id !== business.id)) notFound();

  const rows = categories.data ?? [];
  const groups = rows
    .filter((c) => c.is_group)
    .map((g) => ({
      id: g.id,
      slug: g.slug,
      name: g.name,
      description: g.description,
      children: rows.filter((c) => c.parent_id === g.id).map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
    }));
  const primaryCategory = primary.data?.primary_category as { slug: string } | { slug: string }[] | null | undefined;

  return {
    today: toLocalDate(new Date(), business.timezone),
    data: {
      listing,
      business: {
        id: business.id,
        kind: business.kind,
        status: business.status,
        timeZone: business.timezone,
        slug: business.slug,
        groupSlug: (Array.isArray(primaryCategory) ? primaryCategory[0]?.slug : primaryCategory?.slug) ?? null,
      },
      categories: groups,
      staff,
      hostCard,
      profile: {
        displayName: profile.data?.display_name ?? ctx.displayName,
        avatarUrl: profile.data?.avatar_url ?? null,
        bio: profile.data?.bio ?? null,
      },
      commissionBps,
      businessHours,
    },
  };
}
