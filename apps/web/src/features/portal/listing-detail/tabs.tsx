import Link from "next/link";
import styles from "./listing-detail.module.css";

export type DetailTab = "overview" | "availability" | "reservations" | "reviews";

const LABELS: Record<DetailTab, string> = { overview: "Overview", availability: "Availability", reservations: "Reservations", reviews: "Reviews" };

/** Same pill tabs as the dashboard's reservation tabs. */
export function ListingTabs({ listingId, current, reviewCount }: { listingId: string; current: DetailTab; reviewCount: number }) {
  return (
    <nav className={styles.tabs} aria-label="Listing sections">
      {(Object.keys(LABELS) as DetailTab[]).map((t) => (
        <Link
          key={t}
          href={`/business/listings/${listingId}${t === "overview" ? "" : `?tab=${t}`}`}
          scroll={false}
          className={styles.tab}
          data-active={t === current ? "true" : undefined}
          aria-current={t === current ? "page" : undefined}
        >
          {LABELS[t]}
          {t === "reviews" && reviewCount ? ` (${reviewCount})` : ""}
        </Link>
      ))}
    </nav>
  );
}
