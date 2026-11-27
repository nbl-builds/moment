"use client";

/* eslint-disable @next/next/no-img-element -- photos come from Supabase Storage */
import { coverOf, formatDate, formatTime, toLocalDate, type PortalReservationRow } from "@moment/shared";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { useReservationPanel } from "./reservation-panel";
import { STATUS_LABELS } from "./status";
import styles from "./reservation-row.module.css";

/** Figma 209:1110: photo, listing title, guest, address and time; opens the side panel. */
export function ReservationRow({ row, timeZone, tone = "white", showStatus }: { row: PortalReservationRow; timeZone: string; tone?: "white" | "muted"; showStatus?: boolean }) {
  const api = useBrowserApi();
  const { openReservation } = useReservationPanel();
  const today = toLocalDate(new Date(), timeZone) === toLocalDate(row.starts_at, timeZone);
  const cover = api.media.url(coverOf(row.listing.media));
  const address = row.location ? [row.location.address_line1, row.location.area, row.location.city].filter(Boolean).join(", ") : row.listing.city;
  return (
    <button type="button" className={styles.row} data-tone={tone} onClick={() => openReservation(row.id)}>
      {cover ? <img src={cover} alt="" className={styles.photo} /> : <span className={styles.photo} aria-hidden />}
      <span className={styles.text}>
        <span className={styles.title}>{row.listing.title}</span>
        <span className={styles.guest}>
          {row.guest?.display_name ?? "Guest"} · {row.guest_count} {row.guest_count === 1 ? "guest" : "guests"}
          {showStatus ? ` · ${STATUS_LABELS[row.status]}` : ""}
        </span>
        <span className={styles.address}>{address}</span>
      </span>
      <span className={styles.time}>
        {today ? formatTime(row.starts_at, timeZone) : `${formatDate(row.starts_at, { style: "short", timeZone })} · ${formatTime(row.starts_at, timeZone)}`}
      </span>
    </button>
  );
}
