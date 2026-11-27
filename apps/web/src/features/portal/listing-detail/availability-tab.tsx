import { formatDate, formatTime, type PortalListingDetail } from "@moment/shared";
import Link from "next/link";
import { createServerApi } from "@/lib/api/server";
import { AvailabilityForms, RemoveBlockButton } from "./availability-forms";
import { editHref } from "./links";
import styles from "./listing-detail.module.css";

const WEEKDAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const hm = (t: string) => {
  const [h, m] = t.split(":").map(Number) as [number, number];
  const d = new Date(Date.UTC(2000, 0, 1, h, m));
  return d.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
};

/**
 * Slot mode: upcoming sessions (booked / capacity), Block date and Add session.
 * Appointment mode: the assigned staff's weekly hours. Both list upcoming blocks.
 */
export async function AvailabilityTab({ listing: l, canEdit, timeZone }: { listing: PortalListingDetail; canEdit: boolean; timeZone: string }) {
  const api = await createServerApi();
  const staffIds = l.staff.map((s) => s.id);
  const [slots, blocks, schedules] = await Promise.all([
    l.booking_mode === "slot" ? api.portal.listingSlots(l.id, { limit: 14 }) : Promise.resolve([]),
    api.portal.listingBlocks({ businessId: l.business_id, listingId: l.id, staffIds }),
    l.booking_mode === "appointment" ? api.portal.staffSchedules(staffIds) : Promise.resolve([]),
  ]);

  return (
    <div className={styles.tabBody}>
      {canEdit ? <AvailabilityForms listing={{ id: l.id, businessId: l.business_id, durationMinutes: l.duration_minutes, capacity: l.max_guests, mode: l.booking_mode, staffId: l.staff[0]?.id }} timeZone={timeZone} /> : null}

      {l.booking_mode === "slot" ? (
        <section className={styles.section}>
          <header className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Upcoming sessions</h3>
            {canEdit ? (
              <Link href={editHref(l.id, "availability")} className={styles.editLink}>
                Edit schedule
              </Link>
            ) : null}
          </header>
          {slots.length ? (
            <ul className={styles.sessions}>
              {slots.map((s) => {
                const pct = Math.min(100, Math.round((s.seats_booked / s.capacity) * 100));
                return (
                  <li key={s.id} data-status={s.status}>
                    <span className={styles.sessionWhen}>
                      <strong>{formatDate(s.starts_at, { style: "long", timeZone })}</strong>
                      <small>
                        {formatTime(s.starts_at, timeZone)} – {formatTime(s.ends_at, timeZone)}
                        {s.staff ? ` · ${s.staff.display_name}` : ""}
                      </small>
                    </span>
                    <span className={styles.capacity}>
                      <span className={styles.capacityBar} aria-hidden>
                        <span style={{ width: `${pct}%` }} />
                      </span>
                      <small>
                        {s.seats_booked} / {s.capacity} booked
                      </small>
                    </span>
                    <span className={styles.sessionStatus} data-status={s.status}>
                      {s.status === "open" ? "Open" : s.status === "full" ? "Full" : "Cancelled"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.missing}>No upcoming sessions. {canEdit ? "Add one above or set a weekly schedule." : ""}</p>
          )}
        </section>
      ) : (
        <section className={styles.section}>
          <header className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Weekly hours</h3>
            {canEdit ? (
              <Link href={editHref(l.id, "availability")} className={styles.editLink}>
                Edit hours
              </Link>
            ) : null}
          </header>
          {schedules.length ? (
            <table className={styles.table}>
              <tbody>
                {l.staff.map((st) =>
                  schedules
                    .filter((s) => s.staff_id === st.id)
                    .map((s) => (
                      <tr key={s.id}>
                        <td>{WEEKDAYS[s.weekday]}</td>
                        <td>
                          {hm(s.start_time)} – {hm(s.end_time)}
                        </td>
                        <td>{st.display_name}</td>
                      </tr>
                    )),
                )}
              </tbody>
            </table>
          ) : (
            <p className={styles.missing}>No working hours yet for the people on this listing.</p>
          )}
        </section>
      )}

      <section className={styles.section}>
        <header className={styles.sectionHead}>
          <h3 className={styles.sectionTitle}>Blocked dates</h3>
        </header>
        {blocks.length ? (
          <ul className={styles.blocks}>
            {blocks.map((b) => (
              <li key={b.id}>
                <span>
                  <strong>{formatDate(b.starts_at, { style: "long", timeZone })}</strong>
                  <small>
                    {b.scope === "business" ? "Whole business" : b.scope === "staff" ? `${b.staff?.display_name ?? "Staff"} away` : "This listing"}
                    {b.reason ? ` · ${b.reason}` : ""}
                  </small>
                </span>
                {canEdit && b.scope === "listing" ? <RemoveBlockButton id={b.id} /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.missing}>Nothing blocked.</p>
        )}
      </section>
    </div>
  );
}
