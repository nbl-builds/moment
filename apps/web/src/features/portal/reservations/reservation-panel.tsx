"use client";

/* eslint-disable @next/next/no-img-element -- photos come from Supabase Storage */
import {
  CANCELLATION_POLICIES,
  coverOf,
  formatDate,
  formatPkPhone,
  formatPrice,
  formatReservationTime,
  formatTime,
  type PortalReservation,
} from "@moment/shared";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Sheet } from "@/components/portal/sheet";
import { useToast } from "@/components/portal/toast";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import { PAYMENT_LABELS, STATUS_LABELS, STATUS_TONE } from "./status";
import styles from "./reservation-panel.module.css";

type PanelContext = { openReservation: (bookingId: string) => void };
const Ctx = createContext<PanelContext>({ openReservation: () => {} });
export const useReservationPanel = () => useContext(Ctx);

/** Wraps the portal: any reservation row can open the side panel. `?reservation=<id>` opens it on load. */
export function ReservationPanelProvider({
  children,
  businessId,
  timeZone,
  initialReservationId,
}: {
  children: ReactNode;
  businessId: string;
  timeZone: string;
  initialReservationId?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(initialReservationId ?? null);
  // `?reservation=<id>` (links from notifications, other pages) opens the panel once.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("reservation");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the URL once after hydration
    if (id) setOpenId(id);
  }, []);
  const value = useMemo(() => ({ openReservation: (id: string) => setOpenId(id) }), []);
  return (
    <Ctx.Provider value={value}>
      {children}
      <ReservationPanel bookingId={openId} businessId={businessId} timeZone={timeZone} onClose={() => setOpenId(null)} />
    </Ctx.Provider>
  );
}

type Mode = { kind: "idle" } | { kind: "reason"; action: "decline" | "cancel" } | { kind: "busy" };

function ReservationPanel({
  bookingId,
  businessId,
  timeZone,
  onClose,
}: {
  bookingId: string | null;
  businessId: string;
  timeZone: string;
  onClose: () => void;
}) {
  const api = useBrowserApi();
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<PortalReservation | null>(null);
  const [error, setError] = useState<string>();
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<string>();

  const load = useCallback(
    async (id: string) => {
      setError(undefined);
      try {
        setData(await api.portal.getReservation(id));
      } catch (e) {
        setError(errorMessage(e, "We couldn't load this reservation."));
      }
    },
    [api],
  );

  useEffect(() => {
    if (!bookingId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when another reservation opens
    setData(null);
    setMode({ kind: "idle" });
    setReason("");
    setOutcome(undefined);
    void load(bookingId);
  }, [bookingId, load]);

  async function run(label: string, fn: () => Promise<unknown>, after?: string) {
    if (!bookingId) return;
    setMode({ kind: "busy" });
    try {
      await fn();
      toast(label);
      if (after) setOutcome(after);
      await load(bookingId);
      router.refresh();
    } catch (e) {
      toast(errorMessage(e));
    }
    setMode({ kind: "idle" });
    setReason("");
  }

  async function messageGuest() {
    if (!bookingId) return;
    try {
      const conv = await api.portal.startGuestConversation(bookingId);
      onClose();
      router.push(`/business/inbox?c=${conv.id}`);
    } catch (e) {
      toast(errorMessage(e));
    }
  }

  const b = data;
  const started = b ? new Date(b.starts_at).getTime() <= Date.now() : false;
  const paid = b ? b.payment_status === "paid" || b.payment_status === "partially_paid" : false;
  const busy = mode.kind === "busy";

  const footer = b ? (
    <div className={styles.actions}>
      {mode.kind === "reason" ? (
        <form
          className={styles.reasonForm}
          onSubmit={(e) => {
            e.preventDefault();
            if (!reason.trim()) return;
            const r = reason.trim();
            if (mode.action === "decline") void run("Request declined. The guest has been told.", () => api.portal.declineReservation(b.id, r));
            else
              void run(
                "Reservation cancelled. The guest has been told.",
                () => api.portal.cancelReservation(b.id, r),
                paid
                  ? `The guest gets a full refund of ${formatPrice(b.total_amount, { currency: b.currency })} because you cancelled.`
                  : "Nothing was paid, so there is nothing to refund.",
              );
          }}
        >
          <label className={styles.label} htmlFor="reason">
            {mode.action === "decline" ? "Why are you declining? The guest sees this." : "Why are you cancelling? The guest sees this."}
          </label>
          <textarea id="reason" className={styles.textarea} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} autoFocus />
          {mode.action === "cancel" ? (
            <p className={styles.note}>
              {paid
                ? `The guest paid ${formatPrice(b.total_amount, { currency: b.currency })} and will get a full refund.`
                : "The guest hasn't paid, so there is nothing to refund."}
            </p>
          ) : null}
          <div className={styles.row}>
            <button type="button" className={styles.secondary} onClick={() => setMode({ kind: "idle" })}>
              Back
            </button>
            <button type="submit" className={styles.danger} disabled={!reason.trim()}>
              {mode.action === "decline" ? "Decline request" : "Cancel reservation"}
            </button>
          </div>
        </form>
      ) : (
        <>
          {b.status === "pending" ? (
            <div className={styles.row}>
              <button type="button" className={styles.primary} disabled={busy} onClick={() => void run("Reservation accepted. The guest has been told.", () => api.portal.acceptReservation(b.id))}>
                Accept
              </button>
              <button type="button" className={styles.secondary} disabled={busy} onClick={() => setMode({ kind: "reason", action: "decline" })}>
                Decline
              </button>
            </div>
          ) : null}
          {b.status === "confirmed" ? (
            <div className={styles.row}>
              {started ? (
                <>
                  <button type="button" className={styles.primary} disabled={busy} onClick={() => void run("Marked as completed.", () => api.portal.completeReservation(b.id))}>
                    Mark completed
                  </button>
                  <button type="button" className={styles.secondary} disabled={busy} onClick={() => void run("Marked as a no-show.", () => api.portal.completeReservation(b.id, "no_show"))}>
                    No-show
                  </button>
                </>
              ) : null}
              <button type="button" className={styles.secondary} disabled={busy} onClick={() => setMode({ kind: "reason", action: "cancel" })}>
                Cancel
              </button>
            </div>
          ) : null}
          <button type="button" className={styles.dark} onClick={() => void messageGuest()}>
            Message guest
          </button>
        </>
      )}
    </div>
  ) : null;

  return (
    <Sheet open={Boolean(bookingId)} onClose={onClose} title={b ? `Reservation ${b.code}` : "Reservation"} labelledBy="reservation-title" footer={footer}>
      {error ? <p className={styles.error}>{error}</p> : null}
      {!b && !error ? <PanelSkeleton /> : null}
      {b ? (
        <div className={styles.content} data-business={businessId}>
          <span className={styles.status} data-tone={STATUS_TONE[b.status]}>
            {STATUS_LABELS[b.status]}
          </span>
          {outcome ? <p className={styles.outcome}>{outcome}</p> : null}

          <section className={styles.guest}>
            {b.guest?.avatar_url ? <img src={api.media.url(b.guest.avatar_url) ?? ""} alt="" className={styles.avatar} /> : <span className={styles.avatarFallback}>{(b.contact_name ?? b.guest?.display_name ?? "G").slice(0, 1)}</span>}
            <div>
              <p className={styles.guestName}>{b.contact_name ?? b.guest?.display_name ?? "Guest"}</p>
              {b.contact_phone ? (
                <a className={styles.link} href={`tel:${b.contact_phone}`}>
                  {formatPkPhone(b.contact_phone)}
                </a>
              ) : null}
              {b.guest?.home_city ? <p className={styles.muted}>Lives in {b.guest.home_city}</p> : null}
            </div>
          </section>

          <section className={styles.listing}>
            {coverOf(b.listing.media) ? <img src={api.media.url(coverOf(b.listing.media)) ?? ""} alt="" className={styles.cover} /> : null}
            <div>
              <p className={styles.strong}>{b.listing.title}</p>
              <p className={styles.muted}>{formatReservationTime(b.starts_at, b.ends_at, timeZone)}</p>
              {b.location ? <p className={styles.muted}>{[b.location.address_line1, b.location.area, b.location.city].filter(Boolean).join(", ")}</p> : null}
              {b.staff ? <p className={styles.muted}>With {b.staff.display_name}</p> : null}
            </div>
          </section>

          <dl className={styles.facts}>
            <div>
              <dt>Guests</dt>
              <dd>{b.guest_count}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>{PAYMENT_LABELS[b.payment_status]}</dd>
            </div>
            <div>
              <dt>Booked</dt>
              <dd>
                {formatDate(b.created_at, { style: "medium", timeZone })} · {formatTime(b.created_at, timeZone)}
              </dd>
            </div>
            <div>
              <dt>Policy</dt>
              <dd>{CANCELLATION_POLICIES[b.listing.cancellation_policy].label}</dd>
            </div>
          </dl>

          {b.notes ? (
            <section>
              <h3 className={styles.h3}>Notes from the guest</h3>
              <p className={styles.notes}>{b.notes}</p>
            </section>
          ) : null}

          <section>
            <h3 className={styles.h3}>Price</h3>
            <table className={styles.price}>
              <tbody>
                {b.items.length
                  ? b.items.map((i) => (
                      <tr key={i.id}>
                        <td>
                          {i.name} × {i.quantity}
                        </td>
                        <td>{formatPrice(i.total_amount, { currency: b.currency })}</td>
                      </tr>
                    ))
                  : (
                      <tr>
                        <td>Subtotal</td>
                        <td>{formatPrice(b.subtotal_amount, { currency: b.currency })}</td>
                      </tr>
                    )}
                {b.discount_amount ? (
                  <tr>
                    <td>Discount</td>
                    <td>−{formatPrice(b.discount_amount, { currency: b.currency })}</td>
                  </tr>
                ) : null}
                {b.fee_amount ? (
                  <tr>
                    <td>Moment service fee</td>
                    <td>{formatPrice(b.fee_amount, { currency: b.currency })}</td>
                  </tr>
                ) : null}
                {b.tax_amount ? (
                  <tr>
                    <td>Tax</td>
                    <td>{formatPrice(b.tax_amount, { currency: b.currency })}</td>
                  </tr>
                ) : null}
                <tr className={styles.total}>
                  <td>Total</td>
                  <td>{formatPrice(b.total_amount, { currency: b.currency })}</td>
                </tr>
              </tbody>
            </table>
            {b.payments.length ? (
              <p className={styles.muted}>
                {b.payments
                  .map((p) => `${p.method_summary ?? p.method ?? p.provider}: ${p.status}${p.refunds.length ? `, refunded ${formatPrice(p.refunds.reduce((s, r) => s + r.amount, 0), { currency: b.currency })}` : ""}`)
                  .join(" · ")}
              </p>
            ) : null}
          </section>

          <section>
            <h3 className={styles.h3}>History</h3>
            <ol className={styles.history}>
              {b.events.map((e) => (
                <li key={e.id}>
                  <span className={styles.historyDot} data-tone={STATUS_TONE[e.to_status]} aria-hidden />
                  <div>
                    <p className={styles.strong}>{e.from_status ? STATUS_LABELS[e.to_status] : "Requested"}</p>
                    <p className={styles.muted}>{formatDate(e.created_at, { style: "medium", timeZone })} · {formatTime(e.created_at, timeZone)}</p>
                    {e.note ? <p className={styles.historyNote}>“{e.note}”</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}
    </Sheet>
  );
}

function PanelSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="Loading reservation">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
