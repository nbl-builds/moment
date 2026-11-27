/* eslint-disable @next/next/no-img-element -- avatars come from Supabase Storage */
import { CANCELLATION_POLICIES, formatDuration, formatPrice, priceUnitLabel, type ListingStep, type PortalListingDetail } from "@moment/shared";
import Link from "next/link";
import type { ReactNode } from "react";
import { createServerApi } from "@/lib/api/server";
import { editHref } from "./links";
import styles from "./listing-detail.module.css";

const LANGUAGES: Record<string, string> = { en: "English", ur: "Urdu", pa: "Punjabi", ps: "Pashto", sd: "Sindhi" };

function Section({ title, step, listingId, canEdit, children }: { title: string; step: ListingStep; listingId: string; canEdit: boolean; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {canEdit ? (
          <Link href={editHref(listingId, step)} className={styles.editLink} aria-label={`Edit ${title.toLowerCase()}`}>
            Edit
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/** Overview: everything about the listing, empty sections hidden, each with Edit to its wizard step. */
export async function OverviewTab({ listing: l, canEdit }: { listing: PortalListingDetail; canEdit: boolean }) {
  const api = await createServerApi();
  const money = (n: number) => formatPrice(n, { currency: l.currency });
  const facts = [
    { label: "Type", value: l.type === "experience" ? "Experience" : "Service" },
    { label: "Booking", value: l.booking_mode === "slot" ? "Set sessions" : "Appointments" },
    { label: "Duration", value: formatDuration(l.duration_minutes) },
    { label: "Group size", value: l.min_guests === l.max_guests ? `${l.max_guests}` : `${l.min_guests}–${l.max_guests} guests` },
    { label: "Languages", value: l.languages.map((c) => LANGUAGES[c] ?? c).join(", ") || "Not set" },
    { label: "Instant book", value: l.instant_book ? "On (confirmed at once)" : "Off (you approve requests)" },
  ];
  const options = l.options.filter((o) => o.is_active);
  const mapsUrl = l.point ? `https://www.google.com/maps/search/?api=1&query=${l.point.lat},${l.point.lng}` : null;

  return (
    <div className={styles.tabBody}>
      <Section title="Description" step="details" listingId={l.id} canEdit={canEdit}>
        {l.summary ? <p className={styles.lead}>{l.summary}</p> : null}
        {l.description ? <p className={styles.text}>{l.description}</p> : <p className={styles.missing}>No description yet.</p>}
      </Section>

      <Section title="Details" step="details" listingId={l.id} canEdit={canEdit}>
        <dl className={styles.facts}>
          {facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Pricing and options" step="pricing" listingId={l.id} canEdit={canEdit}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Option</th>
              <th scope="col">Price</th>
              <th scope="col">Charged</th>
            </tr>
          </thead>
          <tbody>
            {options.length ? (
              options.map((o) => (
                <tr key={o.id}>
                  <td>
                    {o.name}
                    {o.duration_minutes && o.duration_minutes !== l.duration_minutes ? <small> · {formatDuration(o.duration_minutes)}</small> : null}
                  </td>
                  <td>{money(o.price_amount)}</td>
                  <td>{priceUnitLabel(l.price_unit)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td>Standard</td>
                <td>{l.price_amount ? money(l.price_amount) : "Not set"}</td>
                <td>{priceUnitLabel(l.price_unit)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      {l.highlights.length || l.includes.length || l.excludes.length ? (
        <Section title="What’s included" step="details" listingId={l.id} canEdit={canEdit}>
          {l.highlights.length ? (
            <>
              <p className={styles.subhead}>
                {l.highlights.length} {l.highlights.length === 1 ? "reason" : "reasons"} to book
              </p>
              <ul className={styles.bullets}>
                {l.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </>
          ) : null}
          {l.includes.length ? (
            <>
              <p className={styles.subhead}>Included</p>
              <ul className={styles.checks}>
                {l.includes.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </>
          ) : null}
          {l.excludes.length ? (
            <>
              <p className={styles.subhead}>Not included</p>
              <ul className={styles.crosses}>
                {l.excludes.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </>
          ) : null}
        </Section>
      ) : null}

      {l.itinerary.length ? (
        <Section title="Itinerary" step="details" listingId={l.id} canEdit={canEdit}>
          <ol className={styles.timeline}>
            {l.itinerary.map((s) => (
              <li key={s.id}>
                <p className={styles.stepTitle}>
                  {s.title}
                  {s.duration_minutes ? <small> · {formatDuration(s.duration_minutes)}</small> : null}
                </p>
                {s.description ? <p className={styles.text}>{s.description}</p> : null}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {l.what_to_bring.length ? (
        <Section title="What to bring" step="details" listingId={l.id} canEdit={canEdit}>
          <ul className={styles.bullets}>
            {l.what_to_bring.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {l.location || l.point ? (
        <Section title="Meeting point" step="location" listingId={l.id} canEdit={canEdit}>
          <div className={styles.mapRow}>
            <div className={styles.mapTile} aria-hidden>
              <span className={styles.mapPin} />
            </div>
            <div>
              {l.location ? <p className={styles.stepTitle}>{[l.location.address_line1, l.location.area, l.location.city].filter(Boolean).join(", ")}</p> : null}
              {l.meeting_point_notes ? <p className={styles.text}>{l.meeting_point_notes}</p> : null}
              {l.point ? <p className={styles.small}>{l.point.lat.toFixed(5)}, {l.point.lng.toFixed(5)}</p> : null}
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className={styles.editLink}>
                  Open in Maps
                </a>
              ) : null}
            </div>
          </div>
        </Section>
      ) : null}

      <Section title="Cancellation policy" step="policies" listingId={l.id} canEdit={canEdit}>
        <p className={styles.stepTitle}>{CANCELLATION_POLICIES[l.cancellation_policy].label}</p>
        <p className={styles.text}>{CANCELLATION_POLICIES[l.cancellation_policy].summary}</p>
      </Section>

      {l.staff.length ? (
        <Section title={l.type === "experience" ? "Hosts" : "Staff"} step="team" listingId={l.id} canEdit={canEdit}>
          <ul className={styles.people}>
            {l.staff.map((s) => (
              <li key={s.id}>
                {s.avatar_url ? <img src={api.media.url(s.avatar_url) ?? ""} alt="" /> : <span className={styles.personFallback}>{s.display_name.slice(0, 1)}</span>}
                <span>
                  <strong>{s.display_name}</strong>
                  <small>{s.title ?? (s.is_host ? "Host" : "Staff")}</small>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
