import { RESERVATION_TAB_LABELS, RESERVATION_TABS, type ReservationTab } from "@moment/shared";
import Link from "next/link";
import { getPortalContext } from "../context";
import { ReservationRow } from "../reservations/reservation-row";
import styles from "./listing-detail.module.css";

/** This listing's reservations with the dashboard tabs and counts; rows open the side panel. */
export async function ReservationsTab({ listingId, current }: { listingId: string; current: ReservationTab }) {
  const ctx = await getPortalContext();
  const [counts, rows] = await Promise.all([
    ctx.api.portal.reservationCounts(ctx.business.id, { listingId, timeZone: ctx.timeZone }),
    ctx.api.portal.listReservations(ctx.business.id, current, { listingId, timeZone: ctx.timeZone }),
  ]);
  return (
    <div className={styles.tabBody}>
      <nav className={styles.subTabs} aria-label="Reservation status">
        {RESERVATION_TABS.map((t) => (
          <Link key={t} href={`/business/listings/${listingId}?tab=reservations&rtab=${t}`} scroll={false} className={styles.subTab} data-active={t === current ? "true" : undefined} aria-current={t === current ? "page" : undefined}>
            {RESERVATION_TAB_LABELS[t]} ({counts[t]})
          </Link>
        ))}
      </nav>
      <div className={styles.panel}>
        {rows.length ? (
          rows.map((r) => <ReservationRow key={r.id} row={r} timeZone={ctx.timeZone} showStatus={current === "cancelled" || current === "completed"} />)
        ) : (
          <p className={styles.missing}>No {RESERVATION_TAB_LABELS[current].toLowerCase()} reservations for this listing.</p>
        )}
      </div>
    </div>
  );
}
