"use client";

import {
  formatDate,
  formatPrice,
  formatTime,
  listingChecklist,
  type ListingStats,
  type PortalListingDetail,
  type PortalReservationRow,
} from "@moment/shared";
import Link from "next/link";
import { useToast } from "@/components/portal/toast";
import { useReservationPanel } from "../reservations/reservation-panel";
import { useListingActions } from "./actions";
import { appLink, editHref, statusLabel } from "./links";
import styles from "./listing-detail.module.css";

function Sparkline({ values }: { values: number[] }) {
  const w = 200;
  const h = 40;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values
    .map(
      (v, i) =>
        `${(i * step).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Daily views, last 30 days"
    >
      <polygon
        points={`0,${h} ${pts} ${w},${h}`}
        className={styles.sparkFill}
      />
      <polyline points={pts} className={styles.sparkLine} />
    </svg>
  );
}

function useCopy() {
  const toast = useToast();
  return async (text: string, message = "Link copied") => {
    try {
      await navigator.clipboard.writeText(text);
      toast(message);
    } catch {
      toast("Couldn't copy. Select the link and copy it instead.");
    }
  };
}

export function SideCards({
  listing,
  businessStatus,
  businessSlug,
  stats,
  nextUp,
  canEdit,
  canSeeRevenue,
  timeZone,
}: {
  listing: PortalListingDetail;
  businessStatus: string;
  businessSlug: string;
  stats: ListingStats;
  nextUp: PortalReservationRow[];
  canEdit: boolean;
  canSeeRevenue: boolean;
  timeZone: string;
}) {
  const actions = useListingActions(listing.id);
  const { openReservation } = useReservationPanel();
  const copy = useCopy();
  const link = appLink(listing, businessSlug);
  const label = statusLabel(listing.status, businessStatus);
  const conversion = stats.views
    ? ((stats.bookings / stats.views) * 100).toFixed(1)
    : null;
  const checklist = listingChecklist({
    ...listing,
    hasMeetingPoint: Boolean(listing.point?.from_meeting_point),
  });
  const ready = checklist.every((c) => c.done);

  return (
    <div className={styles.sideStack}>
      {listing.status === "draft" ? (
        <section className={styles.sideCard} aria-labelledby="finish-title">
          <h2 id="finish-title" className={styles.sideTitle}>
            Finish your listing
          </h2>
          <p className={styles.small}>
            {ready
              ? "Everything guests need is in place."
              : `${checklist.filter((c) => !c.done).length} of ${checklist.length} still to do before you can submit it.`}
          </p>
          <ul className={styles.checklist}>
            {checklist.map((c) => (
              <li key={c.key} data-done={c.done ? "true" : undefined}>
                <span className={styles.checkMark} aria-hidden>
                  {c.done ? "✓" : ""}
                </span>
                {c.done || !canEdit ? (
                  <span>{c.label}</span>
                ) : (
                  <Link href={editHref(listing.id, c.step)}>{c.label}</Link>
                )}
                <span className={styles.srOnly}>
                  {c.done ? "done" : "missing"}
                </span>
              </li>
            ))}
          </ul>
          {canEdit ? (
            ready ? (
              <Link href={editHref(listing.id, "review")} className={`${styles.wideButton} ${styles.wideLime}`}>
                Review &amp; submit
              </Link>
            ) : (
              <button type="button" className={`${styles.wideButton} ${styles.wideLime}`} disabled>
                Review &amp; submit
              </button>
            )
          ) : null}
          {businessStatus !== "active" ? (
            <p className={styles.small}>
              Will go live once your business is approved.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className={styles.sideCard} aria-labelledby="status-title">
        <h2 id="status-title" className={styles.sideTitle}>
          Status
        </h2>
        <p className={styles.statusLine}>
          <span
            className={styles.statusDot}
            data-status={label.toLowerCase().replace(" ", "-")}
            aria-hidden
          />
          <strong>{label}</strong>
          <span className={styles.small}>
            · updated{" "}
            {formatDate(listing.updated_at, { style: "short", timeZone })}
          </span>
        </p>
        {label === "Under review" ? (
          <p className={styles.small}>
            Will go live once your business is approved.
          </p>
        ) : null}
        {listing.status === "published" ? (
          <label className={styles.toggleRow}>
            <span>
              <strong>Accepting bookings</strong>
              <small>
                {listing.accepting_bookings
                  ? "Guests can book."
                  : "Paused: guests can see it but not book."}
              </small>
            </span>
            <input
              type="checkbox"
              role="switch"
              className={styles.switch}
              checked={listing.accepting_bookings}
              disabled={!canEdit || actions.busy}
              onChange={(e) => void actions.setAccepting(e.target.checked)}
            />
          </label>
        ) : null}
        {canEdit ? (
          <Link
            href={editHref(listing.id)}
            className={`${styles.wideButton} ${styles.wideDark}`}
          >
            Edit listing
          </Link>
        ) : null}
        {listing.status === "published" ? (
          <div className={styles.linkRow}>
            <a href={link} className={styles.editLink}>
              View on Moment
            </a>
            <button
              type="button"
              className={styles.editLink}
              onClick={() => void copy(link)}
            >
              Copy link
            </button>
          </div>
        ) : null}
      </section>

      {listing.status !== "draft" ? (
        <>
          <section className={styles.sideCard} aria-labelledby="stats-title">
            <h2 id="stats-title" className={styles.sideTitle}>
              Last 30 days
            </h2>
            <dl className={styles.statsGrid}>
              <div>
                <dt>Views</dt>
                <dd>{stats.views.toLocaleString("en-PK")}</dd>
              </div>
              <div>
                <dt>Bookings</dt>
                <dd>{stats.bookings}</dd>
              </div>
              <div>
                <dt>Conversion</dt>
                <dd>{conversion ? `${conversion}%` : "–"}</dd>
              </div>
              {canSeeRevenue && stats.revenue !== null ? (
                <div>
                  <dt>Revenue</dt>
                  <dd>
                    {formatPrice(stats.revenue, {
                      currency: stats.currency,
                      compact: true,
                    })}
                  </dd>
                </div>
              ) : null}
            </dl>
            <Sparkline values={stats.series.map((s) => s.views)} />
            <Link href="/business/insights" className={styles.editLink}>
              See insights
            </Link>
          </section>

          <section className={styles.sideCard} aria-labelledby="next-title">
            <header className={styles.sectionHead}>
              <h2 id="next-title" className={styles.sideTitle}>
                Next reservations
              </h2>
              <Link
                href={`/business/listings/${listing.id}?tab=reservations`}
                className={styles.editLink}
                scroll={false}
              >
                View all
              </Link>
            </header>
            {nextUp.length ? (
              <ul className={styles.nextList}>
                {nextUp.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => openReservation(r.id)}>
                      <span>
                        <strong>
                          {formatDate(r.starts_at, {
                            style: "short",
                            timeZone,
                          })}{" "}
                          · {formatTime(r.starts_at, timeZone)}
                        </strong>
                        <small>
                          {r.guest?.display_name ?? "Guest"} · {r.guest_count}{" "}
                          {r.guest_count === 1 ? "guest" : "guests"}
                        </small>
                      </span>
                      <span aria-hidden>›</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.small}>No upcoming reservations.</p>
            )}
          </section>
        </>
      ) : null}

      {listing.status === "published" ? (
        <section className={styles.sideCard} aria-labelledby="share-title">
          <h2 id="share-title" className={styles.sideTitle}>
            Share
          </h2>
          <p className={styles.small}>
            Send guests straight to this listing in the Moment app.
          </p>
          <div className={styles.row}>
            <button
              type="button"
              className={styles.pillButton}
              onClick={() => void copy(link)}
            >
              Copy link
            </button>
            <button
              type="button"
              className={`${styles.pillButton} ${styles.pillDark}`}
              onClick={async () => {
                if (navigator.share) {
                  await navigator
                    .share({
                      title: listing.title,
                      text: `${listing.title} on Moment`,
                      url: link,
                    })
                    .catch(() => undefined);
                } else {
                  await copy(
                    link,
                    "Sharing isn't available here, so the link was copied.",
                  );
                }
              }}
            >
              Share
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
