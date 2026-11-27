import Link from "next/link";
import { PortalIcon } from "@/components/portal/icon";
import styles from "./calendar.module.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** One month (Figma 477:2603): header with a rule, prev/next on the first, 7 columns, dots on busy days. */
export function MonthGrid({
  month,
  today,
  selected,
  busyDays,
  hrefFor,
  nav,
}: {
  month: string;
  today: string;
  selected: string;
  busyDays: Set<string>;
  hrefFor: (day: string) => string;
  nav?: { prev: string; next: string };
}) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array<null>(first).fill(null)];
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);

  return (
    <div className={styles.month}>
      <div className={styles.monthHead}>
        <h2 className={styles.monthName}>
          <span>{MONTHS[m - 1]}</span> <strong>{y}</strong>
        </h2>
        <span className={styles.rule} aria-hidden />
        {nav ? (
          <span className={styles.navButtons}>
            <Link href={nav.prev} className={styles.navButton} aria-label="Previous month" scroll={false}>
              <PortalIcon name="chevron-up-sm" />
            </Link>
            <Link href={nav.next} className={styles.navButton} aria-label="Next month" scroll={false}>
              <PortalIcon name="chevron-down-sm" />
            </Link>
          </span>
        ) : null}
      </div>
      <div className={styles.grid} role="grid" aria-label={`${MONTHS[m - 1]} ${y}`}>
        {WEEKDAYS.map((w) => (
          <span key={w} className={styles.weekday} role="columnheader">
            {w}
          </span>
        ))}
        {cells.map((d, i) =>
          d ? (
            <Link
              key={d}
              href={hrefFor(d)}
              scroll={false}
              className={styles.day}
              role="gridcell"
              data-selected={d === selected ? "true" : undefined}
              data-today={d === today ? "true" : undefined}
              aria-current={d === selected ? "date" : undefined}
              aria-label={`${Number(d.slice(8))} ${MONTHS[m - 1]}${busyDays.has(d) ? ", has reservations" : ""}`}
            >
              <span>{Number(d.slice(8))}</span>
              {busyDays.has(d) ? <span className={styles.dot} aria-hidden /> : null}
            </Link>
          ) : (
            <span key={`e${i}`} aria-hidden />
          ),
        )}
      </div>
    </div>
  );
}
