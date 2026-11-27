import { RESERVATION_TABS, type ReservationTab } from "@moment/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPortalContext } from "@/features/portal/context";
import { AvailabilityTab } from "@/features/portal/listing-detail/availability-tab";
import { ListingGallery } from "@/features/portal/listing-detail/gallery";
import { ListingHeader } from "@/features/portal/listing-detail/header";
import { OverviewTab } from "@/features/portal/listing-detail/overview-tab";
import { ReservationsTab } from "@/features/portal/listing-detail/reservations-tab";
import { ReviewsTab } from "@/features/portal/listing-detail/reviews-tab";
import { SideCards } from "@/features/portal/listing-detail/side-cards";
import { TitleBlock } from "@/features/portal/listing-detail/title-block";
import { ListingTabs, type DetailTab } from "@/features/portal/listing-detail/tabs";
import { UnarchiveButton } from "@/features/portal/listing-detail/unarchive-button";
import { requestTime } from "@/lib/business/clock";
import styles from "@/features/portal/listing-detail/listing-detail.module.css";

export const metadata: Metadata = { title: "Listing details" };

const TABS: DetailTab[] = ["overview", "availability", "reservations", "reviews"];

/**
 * Listing Details. Figma 629:7360 has the top bar, the title (x80 / y172) and the
 * cover card (847 x 447 at x80 / y260); the rest follows the portal style.
 */
export default async function ListingDetailsPage({ params, searchParams }: PageProps<"/business/listings/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const ctx = await getPortalContext();
  const listing = await ctx.api.portal.getListing(id).catch(() => null);
  if (!listing || listing.business_id !== ctx.business.id) notFound();

  const tab: DetailTab = TABS.includes(query.tab as DetailTab) ? (query.tab as DetailTab) : "overview";
  const rtab: ReservationTab = (RESERVATION_TABS as readonly string[]).includes(String(query.rtab)) ? (query.rtab as ReservationTab) : "upcoming";
  const canEdit = ctx.permissions.editListings;

  const [stats, nextUp] = await Promise.all([
    ctx.api.portal.listingStats(id),
    Promise.all([
      ctx.api.portal.listReservations(ctx.business.id, "ongoing", { listingId: id, timeZone: ctx.timeZone, limit: 3 }),
      ctx.api.portal.listReservations(ctx.business.id, "upcoming", { listingId: id, timeZone: ctx.timeZone, limit: 3 }),
    ]).then(([a, b]) => [...a.filter((r) => new Date(r.ends_at).getTime() > requestTime()), ...b].slice(0, 3)),
  ]);

  return (
    <div className={styles.page}>
      <ListingHeader listing={listing} businessStatus={ctx.business.status} canEdit={canEdit} />
      {listing.status === "archived" ? <ArchivedNotice listingId={listing.id} canEdit={canEdit} /> : null}
      <div className={styles.columns}>
        <div className={styles.left}>
          <ListingGallery photos={listing.media.map((m) => ({ url: ctx.api.media.url(m.url) ?? "", alt: m.alt ?? listing.title }))} title={listing.title} />
          <TitleBlock listing={listing} />
          <ListingTabs listingId={listing.id} current={tab} reviewCount={listing.rating_count} />
          {tab === "overview" ? <OverviewTab listing={listing} canEdit={canEdit} /> : null}
          {tab === "availability" ? <AvailabilityTab listing={listing} canEdit={canEdit} timeZone={ctx.timeZone} /> : null}
          {tab === "reservations" ? <ReservationsTab listingId={listing.id} current={rtab} /> : null}
          {tab === "reviews" ? <ReviewsTab listingId={listing.id} canReply={ctx.permissions.replyToReviews} /> : null}
        </div>
        <aside className={styles.right}>
          <SideCards
            listing={listing}
            businessStatus={ctx.business.status}
            businessSlug={ctx.business.slug}
            stats={stats}
            nextUp={nextUp}
            canEdit={canEdit}
            canSeeRevenue={ctx.role === "owner" || ctx.role === "manager"}
            timeZone={ctx.timeZone}
          />
        </aside>
      </div>
    </div>
  );
}

function ArchivedNotice({ listingId, canEdit }: { listingId: string; canEdit: boolean }) {
  return (
    <div className={styles.archived} role="status">
      <span>
        <strong>This listing is archived.</strong> Guests can&apos;t see or book it. Its reservations and reviews are kept.
      </span>
      {canEdit ? <UnarchiveButton listingId={listingId} /> : null}
    </div>
  );
}
