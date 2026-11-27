/* eslint-disable @next/next/no-img-element -- photos come from Supabase Storage */
import { CANCELLATION_POLICIES, formatDuration, formatListingPrice } from "@moment/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalIcon } from "@/components/portal/icon";
import { getPortalContext } from "@/features/portal/context";
import styles from "@/features/portal/listing-detail/preview.module.css";

export const metadata: Metadata = { title: "Customer preview" };

const LANGUAGES: Record<string, string> = { en: "English", ur: "Urdu", pa: "Punjabi", ps: "Pashto", sd: "Sindhi" };

/** Read-only customer view: same content and order as the app's Experience details. */
export default async function ListingPreviewPage({ params }: PageProps<"/business/listings/[id]/preview">) {
  const { id } = await params;
  const ctx = await getPortalContext();
  const l = await ctx.api.portal.getListing(id).catch(() => null);
  if (!l || l.business_id !== ctx.business.id) notFound();
  const [reviews, summary] = await Promise.all([
    ctx.api.portal.listReviews(ctx.business.id, { listingId: id, limit: 2 }),
    ctx.api.portal.reviewSummary(ctx.business.id, { listingId: id }),
  ]);
  const photos = l.media.map((m) => ctx.api.media.url(m.url) ?? "");
  const host = l.staff.find((s) => s.is_host) ?? l.staff[0];

  return (
    <div className={styles.page}>
      <div className={styles.bar}>
        <p>
          <strong>Customer preview.</strong> This is how guests see “{l.title}” in the Moment app.
          {l.status !== "published" ? " It isn't visible to guests until it's published." : ""}
        </p>
        <Link href={`/business/listings/${l.id}`} className={styles.back}>
          Back to listing
        </Link>
      </div>

      <div className={styles.phone} aria-label="App preview">
        {photos[0] ? <img src={photos[0]} alt="" className={styles.hero} /> : <div className={`${styles.hero} ${styles.noPhoto}`}>No photos yet</div>}
        <div className={styles.body}>
          <h1 className={styles.title}>{l.title}</h1>
          <p className={styles.meta}>
            {l.city}
            {l.rating_count ? (
              <span className={styles.rating}>
                <PortalIcon name="star-14" /> {Number(l.rating_avg).toFixed(1)}
              </span>
            ) : null}
          </p>
          {l.description ? <p className={styles.text}>{l.description}</p> : null}

          <ul className={styles.facts}>
            <li>{formatDuration(l.duration_minutes)}</li>
            <li>Up to {l.max_guests} guests</li>
            <li>{l.languages.map((c) => LANGUAGES[c] ?? c).join(", ")}</li>
            <li>{l.instant_book ? "Instant confirmation" : "Host confirms"}</li>
          </ul>

          {photos.length > 1 ? (
            <div className={styles.grid}>
              {photos.slice(1, 5).map((p, i) => (
                <img key={p + i} src={p} alt="" />
              ))}
            </div>
          ) : null}

          {l.highlights.length ? (
            <section className={styles.section}>
              <h2>{l.highlights.length} Reasons to book this experience</h2>
              <ul className={styles.bullets}>
                {l.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {host ? (
            <section className={`${styles.section} ${styles.host}`}>
              {host.avatar_url ? <img src={ctx.api.media.url(host.avatar_url) ?? ""} alt="" /> : null}
              <div>
                <h2>
                  Hosted by <span className={styles.third}>{host.display_name}</span>
                </h2>
                <p className={styles.small}>{ctx.business.name}</p>
              </div>
            </section>
          ) : null}

          {l.itinerary.length ? (
            <section className={styles.section}>
              <h2>What you will be doing</h2>
              <ol className={styles.timeline}>
                {l.itinerary.map((s) => (
                  <li key={s.id}>
                    <strong>{s.title}</strong>
                    {s.description ? <p className={styles.small}>{s.description}</p> : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {l.location || l.meeting_point_notes ? (
            <section className={styles.section}>
              <h2>Where we will meet</h2>
              <div className={styles.map} aria-hidden />
              <p className={styles.small}>{[l.location?.address_line1, l.location?.area, l.location?.city].filter(Boolean).join(", ")}</p>
              {l.meeting_point_notes ? <p className={styles.small}>{l.meeting_point_notes}</p> : null}
            </section>
          ) : null}

          {l.what_to_bring.length ? (
            <section className={styles.section}>
              <h2>What to bring</h2>
              <ul className={styles.bullets}>
                {l.what_to_bring.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className={styles.section}>
            <h2>Reviews {summary.total ? `(${summary.total})` : ""}</h2>
            {reviews.length ? (
              reviews.map((r) => (
                <div key={r.id} className={styles.review}>
                  <strong>{r.author?.display_name ?? "Guest"}</strong>
                  <span className={styles.small}> · {r.rating}★</span>
                  {r.body ? <p className={styles.small}>{r.body}</p> : null}
                </div>
              ))
            ) : (
              <p className={styles.small}>No reviews yet.</p>
            )}
          </section>

          <section className={styles.section}>
            <h2>Cancellation</h2>
            <p className={styles.small}>{CANCELLATION_POLICIES[l.cancellation_policy].summary}</p>
          </section>
        </div>
        <div className={styles.bookBar}>
          <span>
            <strong>{l.price_amount ? formatListingPrice(l.price_amount, l.price_unit, { currency: l.currency }) : "Price not set"}</strong>
          </span>
          <span className={styles.book} aria-disabled="true">
            Book me
          </span>
        </div>
      </div>
    </div>
  );
}
