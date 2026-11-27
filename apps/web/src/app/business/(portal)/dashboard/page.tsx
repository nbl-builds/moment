/* eslint-disable @next/next/no-img-element -- avatar comes from Supabase Storage */
import { getZonedParts, RESERVATION_TAB_LABELS, RESERVATION_TABS, toLocalDate, type ReservationTab } from "@moment/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { PortalIcon } from "@/components/portal/icon";
import { SideCards } from "@/features/portal/dashboard/side-cards";
import { getPortalContext } from "@/features/portal/context";
import { ReservationRow } from "@/features/portal/reservations/reservation-row";
import styles from "@/features/portal/dashboard/dashboard.module.css";

export const metadata: Metadata = { title: "Dashboard" };

/** Different empty message per tab (Figma's "checking out" copy only fits Ongoing). */
const EMPTY: Record<ReservationTab, string> = {
  ongoing: "You don’t have any guests with you today.",
  upcoming: "No upcoming reservations yet. New bookings will show up here.",
  pending: "No requests are waiting for you right now.",
  cancelled: "No cancelled reservations. Nice!",
  completed: "No completed reservations yet.",
};

function greeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Good Morning!";
  if (hour >= 12 && hour < 17) return "Good Afternoon!";
  return "Good Evening!";
}

/** Figma 102:2894 (empty) and 209:929 (with reservations). */
export default async function DashboardPage({ searchParams }: PageProps<"/business/dashboard">) {
  const ctx = await getPortalContext();
  const { tab: tabParam } = await searchParams;
  const tab = (RESERVATION_TABS as readonly string[]).includes(String(tabParam)) ? (tabParam as ReservationTab) : "ongoing";
  const [counts, rows, gaps] = await Promise.all([
    ctx.api.portal.reservationCounts(ctx.business.id, { timeZone: ctx.timeZone }),
    ctx.api.portal.listReservations(ctx.business.id, tab, { timeZone: ctx.timeZone }),
    ctx.api.portal.profileGaps(ctx.business.id),
  ]);
  const now = getZonedParts(new Date(), ctx.timeZone);
  const [y, m, d] = toLocalDate(new Date(), ctx.timeZone).split("-");

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <section className={styles.hero}>
          {ctx.avatarUrl ? <img src={ctx.avatarUrl} alt="" className={styles.heroPhoto} /> : <span className={`${styles.heroPhoto} ${styles.heroInitial}`}>{ctx.firstName.slice(0, 1)}</span>}
          <div className={styles.heroText}>
            <div className={styles.hiRow}>
              <p className={styles.hi}>Hi, {ctx.firstName}</p>
              {gaps.length ? (
                <Link href="/business/profile" className={styles.complete}>
                  <PortalIcon name="shield-exclamation" />
                  Complete your profile
                </Link>
              ) : null}
            </div>
            <h1 className={styles.greeting}>{greeting(now.hour)}</h1>
          </div>
          {ctx.permissions.editListings ? (
            <Link href="/business/listings/new" className={styles.createButton}>
              Create new listing
            </Link>
          ) : null}
        </section>
        <div className={styles.side}>
          <SideCards />
        </div>
      </div>

      <div className={styles.reservationsHead}>
        <h2 className={styles.sectionTitle}>Your reservations</h2>
        <p className={styles.today}>
          <PortalIcon name="calendar" />
          <span>
            {d} . {m} . {y}
          </span>
        </p>
      </div>

      <nav className={styles.tabs} aria-label="Reservations">
        {RESERVATION_TABS.map((t) => (
          <Link key={t} href={`/business/dashboard?tab=${t}`} scroll={false} className={styles.tab} data-active={t === tab ? "true" : undefined} aria-current={t === tab ? "page" : undefined}>
            {RESERVATION_TAB_LABELS[t]} ({counts[t]})
          </Link>
        ))}
      </nav>

      <section className={styles.panel} aria-label={`${RESERVATION_TAB_LABELS[tab]} reservations`}>
        {rows.length ? (
          <div className={styles.rows}>
            {rows.map((r) => (
              <ReservationRow key={r.id} row={r} timeZone={ctx.timeZone} showStatus={tab === "cancelled" || tab === "completed"} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <PortalIcon name="empty-envelope" />
            <p>{EMPTY[tab]}</p>
          </div>
        )}
      </section>
    </div>
  );
}
