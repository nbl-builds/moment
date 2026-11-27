import { addDaysToLocalDate, formatDate, localDateTimeToIso, toLocalDate } from "@moment/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { PortalIcon } from "@/components/portal/icon";
import { MonthGrid } from "@/features/portal/calendar/month-grid";
import { getPortalContext } from "@/features/portal/context";
import { ReservationRow } from "@/features/portal/reservations/reservation-row";
import styles from "@/features/portal/calendar/calendar.module.css";

export const metadata: Metadata = { title: "Calendar" };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Figma 102:3034 (no published listing) and 477:2553 (with reservations). */
export default async function CalendarPage({ searchParams }: PageProps<"/business/calendar">) {
  const ctx = await getPortalContext();
  const params = await searchParams;
  const today = toLocalDate(new Date(), ctx.timeZone);
  const month = typeof params.month === "string" && MONTH_RE.test(params.month) ? params.month : today.slice(0, 7);
  const day = typeof params.day === "string" && DAY_RE.test(params.day) ? params.day : today;
  const second = addMonths(month, 1);

  const from = localDateTimeToIso(`${month}-01`, "00:00", ctx.timeZone);
  const to = localDateTimeToIso(`${addMonths(month, 2)}-01`, "00:00", ctx.timeZone);
  const dayFrom = localDateTimeToIso(day, "00:00", ctx.timeZone);
  const dayTo = localDateTimeToIso(addDaysToLocalDate(day, 1), "00:00", ctx.timeZone);

  const [published, monthRows, dayRows] = await Promise.all([
    ctx.api.db.from("listings").select("id", { count: "exact", head: true }).eq("business_id", ctx.business.id).eq("status", "published"),
    ctx.api.portal.reservationsBetween(ctx.business.id, from, to),
    ctx.api.portal.reservationsBetween(ctx.business.id, dayFrom, dayTo),
  ]);
  const hasPublished = (published.count ?? 0) > 0;
  const busyDays = new Set(monthRows.map((r) => toLocalDate(r.starts_at, ctx.timeZone)));
  const link = (m: string, d: string) => `/business/calendar?month=${m}&day=${d}`;

  return (
    <div className={styles.layout}>
      <section className={styles.calendarCard}>
        <h1 className={styles.title}>Calendar</h1>
        <div className={styles.months}>
          <MonthGrid
            month={month}
            today={today}
            selected={day}
            busyDays={busyDays}
            hrefFor={(d) => link(month, d)}
            nav={{ prev: link(addMonths(month, -1), day), next: link(addMonths(month, 1), day) }}
          />
          <MonthGrid month={second} today={today} selected={day} busyDays={busyDays} hrefFor={(d) => link(month, d)} />
        </div>
        {month !== today.slice(0, 7) || day !== today ? (
          <Link href="/business/calendar" className={styles.todayLink}>
            Back to today
          </Link>
        ) : null}
      </section>

      <section className={styles.listCard} aria-label={`Reservations on ${formatDate(dayFrom, { timeZone: ctx.timeZone })}`}>
        {!hasPublished ? (
          <div className={styles.empty}>
            <div className={styles.emptyArt}>
              <PortalIcon name="tile-background" />
              <span className={styles.emptyIcon}>
                <PortalIcon name="calendar-illustration" />
              </span>
            </div>
            <p>You need to complete your listing in order to see the reservations on calendar.</p>
            <Link href="/business/listings?tab=draft" className={styles.completeButton}>
              Complete your listing
            </Link>
          </div>
        ) : (
          <>
            <h2 className={styles.dayTitle}>{formatDate(dayFrom, { timeZone: ctx.timeZone })}</h2>
            {dayRows.length ? (
              <div className={styles.rows}>
                {dayRows.map((r) => (
                  <ReservationRow key={r.id} row={r} timeZone={ctx.timeZone} tone="muted" showStatus />
                ))}
              </div>
            ) : (
              <p className={styles.noneToday}>No reservations on this day. Days with a dot have reservations.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
