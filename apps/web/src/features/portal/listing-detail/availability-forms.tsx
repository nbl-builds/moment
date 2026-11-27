"use client";

import { addDaysToLocalDate, toLocalDate } from "@moment/shared";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/portal/toast";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import styles from "./listing-detail.module.css";

/** Block date (any mode) and Add session (slot mode). */
export function AvailabilityForms({
  listing,
  timeZone,
}: {
  listing: { id: string; businessId: string; durationMinutes: number; capacity: number; mode: string; staffId?: string };
  timeZone: string;
}) {
  const api = useBrowserApi();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<"block" | "session" | null>(null);
  const [today] = useState(() => toLocalDate(new Date(), timeZone));
  const [date, setDate] = useState(() => addDaysToLocalDate(toLocalDate(new Date(), timeZone), 1));
  const [time, setTime] = useState("10:00");
  const [capacity, setCapacity] = useState(listing.capacity);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (open === "block") {
        await api.portal.blockListingDate({ businessId: listing.businessId, listingId: listing.id, date, timeZone, reason: reason.trim() });
        toast("Date blocked. Empty sessions that day are cancelled.");
      } else {
        await api.portal.addSession({ businessId: listing.businessId, listingId: listing.id, date, time, timeZone, durationMinutes: listing.durationMinutes, capacity, staffId: listing.staffId });
        toast("Session added. Guests can book it now.");
      }
      setOpen(null);
      setReason("");
      router.refresh();
    } catch (err) {
      toast(errorMessage(err, open === "session" ? "There's already a session at that time." : "We couldn't block that date."));
    }
    setBusy(false);
  }

  return (
    <div className={styles.availActions}>
      <div className={styles.row}>
        <button type="button" className={styles.pillButton} aria-expanded={open === "block"} onClick={() => setOpen(open === "block" ? null : "block")}>
          Block date
        </button>
        {listing.mode === "slot" ? (
          <button type="button" className={`${styles.pillButton} ${styles.pillDark}`} aria-expanded={open === "session"} onClick={() => setOpen(open === "session" ? null : "session")}>
            Add session
          </button>
        ) : null}
      </div>
      {open ? (
        <form className={styles.inlineForm} onSubmit={submit}>
          <label>
            <span>Date</span>
            <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} required />
          </label>
          {open === "session" ? (
            <>
              <label>
                <span>Start time</span>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </label>
              <label>
                <span>Spots</span>
                <input type="number" min={1} max={500} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required />
              </label>
            </>
          ) : (
            <label className={styles.grow}>
              <span>Reason (only your team sees it)</span>
              <input type="text" value={reason} maxLength={140} onChange={(e) => setReason(e.target.value)} placeholder="Public holiday, private event…" />
            </label>
          )}
          <button type="submit" className={`${styles.pillButton} ${styles.pillDark}`} disabled={busy}>
            {busy ? "Saving…" : open === "block" ? "Block" : "Add"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function RemoveBlockButton({ id }: { id: string }) {
  const api = useBrowserApi();
  const router = useRouter();
  const toast = useToast();
  return (
    <button
      type="button"
      className={styles.editLink}
      onClick={async () => {
        try {
          await api.portal.removeBlock(id);
          toast("Unblocked. Cancelled sessions stay cancelled; add new ones if you need them.");
          router.refresh();
        } catch (e) {
          toast(errorMessage(e));
        }
      }}
    >
      Remove
    </button>
  );
}
