"use client";

import {
  afterCommission,
  BOOKING_CUTOFFS,
  BUFFER_OPTIONS,
  CANCELLATION_POLICIES,
  DURATION_OPTIONS,
  durationLabel,
  formatDate,
  formatPrice,
  formatTime,
  formatTimeOfDay,
  ISO_WEEKDAYS,
  type CancellationPolicyKey,
} from "@moment/shared";
import { useState } from "react";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import { toMinor, type Draft } from "../state";
import type { StepContext } from "../wizard";
import styles from "../wizard.module.css";

const GROUP_SIZES = Array.from({ length: 50 }, (_, i) => i + 1);

/** Figma 616:3963: public and private group maximums. */
export function GroupStep({ draft, set }: StepContext) {
  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>Maximum group size</h2>
      <p className={styles.lead}>
        Think about what group size is best for your experience. Is it more interactive with fewer people, or more fun with a larger group? Remember: if
        only one person books, you’ll still be expected to host.
      </p>
      <div className={styles.stack}>
        <div className={styles.block}>
          <label className={styles.label} htmlFor="public-max">
            Public Group
          </label>
          <select id="public-max" className={styles.select} value={draft.maxGuests} onChange={(e) => set({ maxGuests: Number(e.target.value) })}>
            {GROUP_SIZES.map((n) => (
              <option key={n} value={n}>
                Up to {n} {n === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
          <span className={styles.hint}>Strangers can join the same session until it’s full.</span>
        </div>
        <div className={styles.block}>
          <label className={styles.label} htmlFor="private-max">
            Private group
          </label>
          <select id="private-max" className={styles.select} value={draft.privateMax} onChange={(e) => set({ privateMax: Number(e.target.value) })}>
            <option value={0}>No private bookings</option>
            {GROUP_SIZES.map((n) => (
              <option key={n} value={n}>
                Up to {n} {n === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
          <span className={styles.hint}>One group books the whole session for themselves. You set the private price under Guest pricing.</span>
        </div>
      </div>
    </div>
  );
}

/** Services: who performs it (from the business's staff), or add someone. */
export function StaffStep({ draft, set, data, notify, addStaff }: StepContext) {
  const api = useBrowserApi();
  const [staff, setStaff] = useState(data.staff);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const toggle = (id: string) => set({ staffIds: draft.staffIds.includes(id) ? draft.staffIds.filter((s) => s !== id) : [...draft.staffIds, id] });

  const add = async () => {
    setAdding(true);
    try {
      const member = await api.listingEditor.addStaff({ businessId: data.business.id, displayName: name.trim(), title: title.trim() || null });
      setStaff((s) => [...s, member]);
      addStaff(member);
      set({ staffIds: [...draft.staffIds, member.id], staffHours: { ...draft.staffHours, [member.id]: [] } });
      setName("");
      setTitle("");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>Who performs this service?</h2>
      <p className={styles.lead}>Guests can pick one of them when they book. You set each person’s hours under Availability.</p>
      <div className={styles.stack}>
        {staff.length ? (
          <ul className={styles.choiceList} aria-label="Staff">
            {staff.map((s) => (
              <li key={s.id}>
                <button type="button" role="checkbox" aria-checked={draft.staffIds.includes(s.id)} className={styles.choice} onClick={() => toggle(s.id)}>
                  <span className={`${styles.radio} ${styles.checkbox}`} aria-hidden />
                  <span className={styles.person}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- staff photo */}
                    {s.avatar_url ? <img src={api.media.url(s.avatar_url) ?? ""} alt="" className={styles.avatar} /> : <span className={styles.avatar} aria-hidden />}
                    <span className={styles.choiceText}>
                      <span className={styles.choiceTitle}>{s.display_name}</span>
                      <span className={styles.hint}>{[s.title, s.schedules.length ? `${s.schedules.length} shifts a week` : "No hours yet"].filter(Boolean).join(" · ")}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.note}>No staff yet. Add the people who perform this service.</p>
        )}
        <div className={styles.panel}>
          <span className={styles.label}>Add a staff member</span>
          <div className={styles.row2}>
            <input className={styles.input} aria-label="Name" placeholder="Name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            <input className={styles.input} aria-label="Role" placeholder="Role (optional)" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <button type="button" className={styles.smallButton} disabled={name.trim().length < 2 || adding} onClick={add}>
            {adding ? "Adding…" : "Add staff member"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Not in Figma: weekly schedule + one-off dates (experiences), staff hours + buffer (services). */
export function AvailabilityStep(ctx: StepContext) {
  return ctx.draft.type === "service" ? <ServiceAvailability {...ctx} /> : <ExperienceAvailability {...ctx} />;
}

function ExperienceAvailability({ draft, set, listing, data, refresh, notify }: StepContext) {
  const api = useBrowserApi();
  const [time, setTime] = useState("10:00");
  const [oneDate, setOneDate] = useState("");
  const [oneTime, setOneTime] = useState("10:00");
  const [busy, setBusy] = useState(false);
  if (!listing) return null;
  const tz = data.business.timeZone;

  const toggleDay = (d: number) => set({ weekdays: draft.weekdays.includes(d) ? draft.weekdays.filter((x) => x !== d) : [...draft.weekdays, d].sort() });
  const addTime = () => !draft.times.includes(time) && set({ times: [...draft.times, time].sort() });

  const addOneOff = async () => {
    setBusy(true);
    try {
      await api.listingEditor.addOneOffSession({
        businessId: data.business.id,
        listingId: listing.id,
        date: oneDate,
        time: oneTime,
        timeZone: tz,
        durationMinutes: draft.duration,
        capacity: draft.maxGuests,
      });
      setOneDate("");
      await refresh();
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const removeOneOff = async (id: string) => {
    try {
      await api.listingEditor.removeOneOffSession(id);
      await refresh();
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  };

  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>When can guests book?</h2>
      <p className={styles.lead}>
        Set a weekly schedule, add one-off dates, or both. Each session takes up to {draft.maxGuests} {draft.maxGuests === 1 ? "guest" : "guests"} (your group size).
      </p>
      <div className={styles.stack}>
        <div className={styles.block}>
          <span className={styles.label} id="days-label">
            Days of the week
          </span>
          <div className={styles.chips} role="group" aria-labelledby="days-label">
            {ISO_WEEKDAYS.map((d) => (
              <button key={d.value} type="button" aria-pressed={draft.weekdays.includes(d.value)} className={`${styles.chip} ${styles.chipSmall}`} onClick={() => toggleDay(d.value)}>
                {d.short}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.block}>
          <span className={styles.label}>Start times</span>
          <div className={styles.addRow}>
            <input type="time" className={styles.input} aria-label="Start time" value={time} step={900} onChange={(e) => setTime(e.target.value)} />
            <button type="button" className={styles.smallButton} onClick={addTime} disabled={!time}>
              Add time
            </button>
          </div>
          {draft.times.length ? (
            <div className={styles.chips}>
              {draft.times.map((t) => (
                <button key={t} type="button" className={`${styles.chip} ${styles.chipSmall}`} aria-pressed onClick={() => set({ times: draft.times.filter((x) => x !== t) })} aria-label={`Remove ${t}`}>
                  {formatTimeOfDay(t)} ×
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className={styles.row2}>
          <div className={styles.block}>
            <label className={styles.label} htmlFor="from">
              From
            </label>
            <input id="from" type="date" className={styles.input} value={draft.validFrom} onChange={(e) => set({ validFrom: e.target.value })} />
          </div>
          <div className={styles.block}>
            <label className={styles.label} htmlFor="until">
              Until (optional)
            </label>
            <input id="until" type="date" className={styles.input} value={draft.validUntil} min={draft.validFrom} onChange={(e) => set({ validUntil: e.target.value })} />
          </div>
        </div>
        <div className={styles.panel}>
          <span className={styles.label}>One-off dates</span>
          <span className={styles.hint}>Extra sessions outside the weekly schedule (saved straight away).</span>
          <div className={styles.row2}>
            <input type="date" className={styles.input} aria-label="Date" value={oneDate} onChange={(e) => setOneDate(e.target.value)} />
            <input type="time" className={styles.input} aria-label="Time" value={oneTime} step={900} onChange={(e) => setOneTime(e.target.value)} />
          </div>
          <button type="button" className={styles.smallButton} disabled={!oneDate || !oneTime || busy} onClick={addOneOff}>
            {busy ? "Adding…" : "Add date"}
          </button>
          {listing.oneOffSessions.length ? (
            <ul className={styles.itemList} aria-label="One-off sessions">
              {listing.oneOffSessions.map((s) => (
                <li key={s.id} className={styles.item}>
                  {formatDate(s.starts_at, { timeZone: tz })} · {formatTime(s.starts_at, tz)}
                  {s.seats_booked === 0 ? (
                    <button type="button" className={styles.removeButton} onClick={() => removeOneOff(s.id)}>
                      Remove
                    </button>
                  ) : (
                    <span className={styles.hint}>{s.seats_booked} booked</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ServiceAvailability({ draft, set, data }: StepContext) {
  const people = data.staff.filter((s) => draft.staffIds.includes(s.id));
  const hours = data.businessHours;
  const setDay = (staffId: string, weekday: number, patch: { start?: string; end?: string } | null) => {
    const list = draft.staffHours[staffId] ?? [];
    const rest = list.filter((h) => h.weekday !== weekday);
    const current = list.find((h) => h.weekday === weekday) ?? { weekday, start: "10:00", end: "19:00" };
    const next = patch === null ? rest : [...rest, { ...current, ...patch }].sort((a, b) => a.weekday - b.weekday);
    set({ staffHours: { ...draft.staffHours, [staffId]: next } });
  };

  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>When can guests book?</h2>
      <p className={styles.lead}>Appointments fit inside each person’s hours and your opening hours, with a gap between them.</p>
      <div className={styles.stack}>
        {hours.length ? (
          <p className={styles.note}>
            Opening hours:{" "}
            {ISO_WEEKDAYS.map((d) => {
              const h = hours.filter((x) => x.weekday === d.value % 7); // business_hours: 0 = Sunday
              return `${d.short} ${h.length ? h.map((x) => `${formatTimeOfDay(x.opens_at)}–${formatTimeOfDay(x.closes_at)}`).join(", ") : "closed"}`;
            }).join(" · ")}
            . Change them in your business profile.
          </p>
        ) : (
          <p className={styles.note}>No opening hours set: appointments follow staff hours only. Add them in your business profile.</p>
        )}
        {people.length === 0 ? <p className={styles.error}>Choose who performs this service first (Staff step).</p> : null}
        {people.map((p) => (
          <div key={p.id} className={styles.panel}>
            <span className={styles.label}>{p.display_name}</span>
            {ISO_WEEKDAYS.map((d) => {
              const h = (draft.staffHours[p.id] ?? []).find((x) => x.weekday === d.value);
              return (
                <div key={d.value} className={styles.hoursRow}>
                  <label className={styles.dayToggle}>
                    <input type="checkbox" checked={Boolean(h)} onChange={(e) => setDay(p.id, d.value, e.target.checked ? {} : null)} />
                    {d.short}
                  </label>
                  {h ? (
                    <>
                      <input type="time" className={styles.input} aria-label={`${p.display_name} ${d.label} start`} value={h.start} step={900} onChange={(e) => setDay(p.id, d.value, { start: e.target.value })} />
                      <input type="time" className={styles.input} aria-label={`${p.display_name} ${d.label} end`} value={h.end} step={900} onChange={(e) => setDay(p.id, d.value, { end: e.target.value })} />
                    </>
                  ) : (
                    <span className={styles.hint}>Off</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div className={styles.row2}>
          <div className={styles.block}>
            <label className={styles.label} htmlFor="buffer">
              Gap between appointments
            </label>
            <select id="buffer" className={styles.select} value={draft.buffer} onChange={(e) => set({ buffer: Number(e.target.value) })}>
              {BUFFER_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? "No gap" : `${m} minutes`}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.block}>
            <label className={styles.label} htmlFor="interval">
              Start times every
            </label>
            <select id="interval" className={styles.select} value={draft.interval} onChange={(e) => set({ interval: Number(e.target.value) })}>
              {[15, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Not in Figma: instant book vs request, cut-off, cancellation policy. */
export function BookingStep({ draft, set }: StepContext) {
  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>Booking settings</h2>
      <p className={styles.lead}>Choose how bookings come in and what guests get back if they cancel.</p>
      <div className={styles.stack}>
        <div className={styles.block}>
          <span className={styles.label} id="mode-label">
            How guests book
          </span>
          <ul className={styles.choiceList} role="radiogroup" aria-labelledby="mode-label">
            <Choice checked={draft.instantBook} title="Instant book" text="Bookings are confirmed straight away. Best for getting more bookings." onClick={() => set({ instantBook: true })} />
            <Choice checked={!draft.instantBook} title="Request to book" text="You accept or decline each booking from your dashboard within 24 hours." onClick={() => set({ instantBook: false })} />
          </ul>
        </div>
        <div className={styles.block}>
          <label className={styles.label} htmlFor="cutoff">
            Booking cut-off
          </label>
          <select id="cutoff" className={styles.select} value={draft.cutoff} onChange={(e) => set({ cutoff: Number(e.target.value) })}>
            {BOOKING_CUTOFFS.map((c) => (
              <option key={c.minutes} value={c.minutes}>
                {c.label}
              </option>
            ))}
          </select>
          <span className={styles.hint}>Guests can book until this long before the start.</span>
        </div>
        <div className={styles.block}>
          <span className={styles.label} id="policy-label">
            Cancellation policy
          </span>
          <ul className={styles.choiceList} role="radiogroup" aria-labelledby="policy-label">
            {(Object.keys(CANCELLATION_POLICIES) as CancellationPolicyKey[]).map((k) => (
              <Choice key={k} checked={draft.policy === k} title={CANCELLATION_POLICIES[k].label} text={CANCELLATION_POLICIES[k].summary} onClick={() => set({ policy: k })} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Choice({ checked, title, text, onClick }: { checked: boolean; title: string; text: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" role="radio" aria-checked={checked} className={styles.choice} onClick={onClick}>
        <span className={styles.radio} aria-hidden />
        <span className={styles.choiceText}>
          <span className={styles.choiceTitle}>{title}</span>
          <span className={styles.hint}>{text}</span>
        </span>
      </button>
    </li>
  );
}

/** Figma 616:4055 is a placeholder: price, unit, private price, options and "You'll earn". */
export function PricingStep({ draft, set, data }: StepContext) {
  const bps = data.commissionBps;
  const price = toMinor(draft.price);
  const unit = draft.priceUnit === "per_person" ? "per guest" : "per booking";
  const setOption = (i: number, patch: Partial<Draft["options"][number]>) => set({ options: draft.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>Guest pricing</h2>
      <p className={styles.lead}>Set your price in Pakistani rupees. Guests see this price; Moment’s {bps / 100}% fee comes out of it.</p>
      <div className={styles.stack}>
        {draft.type === "experience" ? (
          <div className={styles.block}>
            <span className={styles.label} id="unit-label">
              How you charge
            </span>
            <ul className={styles.choiceList} role="radiogroup" aria-labelledby="unit-label">
              <Choice checked={draft.priceUnit === "per_person"} title="Per person" text="Each guest pays the price." onClick={() => set({ priceUnit: "per_person" })} />
              <Choice checked={draft.priceUnit === "per_booking"} title="Per booking" text="One price for the whole booking, however many guests." onClick={() => set({ priceUnit: "per_booking" })} />
            </ul>
          </div>
        ) : null}
        <div className={styles.block}>
          <label className={styles.label} htmlFor="price">
            Price ({unit})
          </label>
          <PriceInput id="price" value={draft.price} onChange={(v) => set({ price: v })} />
        </div>
        {price > 0 ? (
          <div className={styles.earn} aria-live="polite">
            You’ll earn
            <span className={styles.earnFigure}>{formatPrice(afterCommission(price, bps))}</span>
            {unit} after Moment’s {bps / 100}% fee ({formatPrice(price - afterCommission(price, bps))}).
          </div>
        ) : null}
        {draft.type === "experience" && draft.privateMax > 0 ? (
          <div className={styles.block}>
            <label className={styles.label} htmlFor="private-price">
              Private group price (whole session, up to {draft.privateMax} guests)
            </label>
            <PriceInput id="private-price" value={draft.privatePrice} onChange={(v) => set({ privatePrice: v })} />
            {toMinor(draft.privatePrice) > 0 ? (
              <span className={styles.hint}>You’ll earn {formatPrice(afterCommission(toMinor(draft.privatePrice), bps))} per private booking.</span>
            ) : null}
          </div>
        ) : null}
        <div className={styles.panel}>
          <span className={styles.label}>Extra options or tiers (optional)</span>
          <span className={styles.hint}>
            {draft.type === "service" ? "e.g. 60 or 90 minutes, a deluxe version. Guests pick one when they book." : "e.g. Vegetarian menu, VIP seating. Guests pick one instead of the base price."}
          </span>
          {draft.options.map((o, i) => (
            <div key={o.id ?? `new-${i}`} className={styles.block}>
              <div className={styles.row2}>
                <input className={styles.input} aria-label={`Option ${i + 1} name`} placeholder="Name" value={o.name} maxLength={80} onChange={(e) => setOption(i, { name: e.target.value })} />
                <PriceInput id={`option-${i}`} label={`Option ${i + 1} price`} value={o.price} onChange={(v) => setOption(i, { price: v })} />
              </div>
              <div className={styles.linkRow} style={{ justifyContent: "space-between" }}>
                {draft.type === "service" ? (
                  <select
                    className={styles.select}
                    style={{ maxWidth: "50%" }}
                    aria-label={`Option ${i + 1} duration`}
                    value={o.duration ?? ""}
                    onChange={(e) => setOption(i, { duration: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">Same duration</option>
                    {DURATION_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {durationLabel(m)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span />
                )}
                <button type="button" className={styles.removeButton} onClick={() => set({ options: draft.options.filter((_, j) => j !== i) })}>
                  Remove option
                </button>
              </div>
            </div>
          ))}
          <button type="button" className={styles.underlineButton} onClick={() => set({ options: [...draft.options, { name: "", price: "", duration: null }] })}>
            + Add an option
          </button>
        </div>
      </div>
    </div>
  );
}

function PriceInput({ id, value, onChange, label }: { id: string; value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className={styles.input} style={{ gap: "var(--web-space-8)" }}>
      <span className={styles.placeholder}>Rs</span>
      <input
        id={id}
        aria-label={label}
        inputMode="numeric"
        className={styles.bareInput}
        value={value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
      />
    </div>
  );
}

/** Figma 616:4131 is a placeholder: large-group and early-bird discounts. */
export function DiscountStep({ draft, set }: StepContext) {
  const price = toMinor(draft.price);
  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>Discount</h2>
      <p className={styles.lead}>Optional. Guests get the better of the two automatically; it shows on their Confirm screen.</p>
      <div className={styles.stack}>
        {draft.type === "experience" ? (
          <div className={styles.panel}>
            <div className={styles.toggleRow}>
              <span className={styles.choiceText}>
                <span className={styles.choiceTitle} id="group-discount">
                  Large group discount
                </span>
                <span className={styles.hint}>For bookings of several guests at once.</span>
              </span>
              <button type="button" role="switch" aria-checked={draft.groupOn} aria-labelledby="group-discount" className={styles.switch} onClick={() => set({ groupOn: !draft.groupOn })} />
            </div>
            {draft.groupOn ? (
              <div className={styles.row2}>
                <NumberField id="group-min" label="Guests or more" value={draft.groupMin} min={2} max={Math.max(2, draft.maxGuests)} onChange={(groupMin) => set({ groupMin })} />
                <NumberField id="group-pct" label="Discount %" value={draft.groupPercent} min={1} max={90} onChange={(groupPercent) => set({ groupPercent })} />
              </div>
            ) : null}
            {draft.groupOn && price > 0 ? (
              <span className={styles.hint}>
                e.g. {draft.groupMin} guests pay {formatPrice(Math.round(price * (draft.priceUnit === "per_person" ? draft.groupMin : 1) * (1 - draft.groupPercent / 100)))} instead of{" "}
                {formatPrice(price * (draft.priceUnit === "per_person" ? draft.groupMin : 1))}.
              </span>
            ) : null}
          </div>
        ) : null}
        <div className={styles.panel}>
          <div className={styles.toggleRow}>
            <span className={styles.choiceText}>
              <span className={styles.choiceTitle} id="early-discount">
                Early-bird discount
              </span>
              <span className={styles.hint}>For guests who book well ahead.</span>
            </span>
            <button type="button" role="switch" aria-checked={draft.earlyOn} aria-labelledby="early-discount" className={styles.switch} onClick={() => set({ earlyOn: !draft.earlyOn })} />
          </div>
          {draft.earlyOn ? (
            <div className={styles.row2}>
              <NumberField id="early-days" label="Days ahead or more" value={draft.earlyDays} min={1} max={365} onChange={(earlyDays) => set({ earlyDays })} />
              <NumberField id="early-pct" label="Discount %" value={draft.earlyPercent} min={1} max={90} onChange={(earlyPercent) => set({ earlyPercent })} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function NumberField({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className={styles.block}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        className={styles.input}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.min(max, Math.max(0, Number(e.target.value) || 0)))}
      />
    </div>
  );
}
