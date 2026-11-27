import type { PortalListingDetail } from "@moment/shared";
import { PortalIcon } from "@/components/portal/icon";
import { CATEGORY_ICONS } from "@/lib/business/categories";
import styles from "./listing-detail.module.css";

/** Title, category chip with its icon, area / city, rating and total bookings. */
export function TitleBlock({ listing }: { listing: PortalListingDetail }) {
  const group = listing.category?.parent ?? listing.category;
  const icon = group ? CATEGORY_ICONS[group.slug] : undefined;
  const place = [listing.location?.area, listing.city].filter(Boolean).join(", ");
  return (
    <div className={styles.titleBlock}>
      <h2 className={styles.listingTitle}>{listing.title}</h2>
      <p className={styles.metaRow}>
        {listing.category ? (
          <span className={styles.chip}>
            {icon ? <PortalIcon name={icon} size={18} /> : null}
            {listing.category.name}
          </span>
        ) : null}
        {place ? <span>{place}</span> : null}
        <span className={styles.rating}>
          <PortalIcon name="star-14" />
          {listing.rating_count ? `${Number(listing.rating_avg).toFixed(1)} (${listing.rating_count})` : "No reviews yet"}
        </span>
        <span>
          {listing.booking_count} {listing.booking_count === 1 ? "booking" : "bookings"}
        </span>
      </p>
    </div>
  );
}
