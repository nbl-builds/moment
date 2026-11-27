"use client";

import {
  ACTIVITY_LEVELS,
  CANCELLATION_POLICIES,
  cutoffLabel,
  durationLabel,
  formatPrice,
  languageLabel,
  minAgeLabel,
  SKILL_LEVELS,
  stepLabel,
  wizardSteps,
  type WizardStep,
} from "@moment/shared";
import Link from "next/link";
import { useRef, useState } from "react";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import { submitListing } from "../actions";
import { resizePhoto, ACCEPTED_PHOTOS } from "../photos";
import { stepValid, toMinor } from "../state";
import type { StepContext } from "../wizard";
import { LanguageSheet } from "./idea";
import styles from "../wizard.module.css";

/** Figma 616:4209 is a placeholder: the host card guests see, prefilled from the profile. */
export function HostStep({ draft, set, data, notify }: StepContext) {
  const api = useBrowserApi();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [sheet, setSheet] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const resized = await resizePhoto(file);
      set({ hostAvatar: await api.listingEditor.uploadHostPhoto({ businessId: data.business.id, file: resized }) });
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>Your information</h2>
      <p className={styles.lead}>This is the host card guests see on your {draft.type} page. It’s shared by all your listings.</p>
      <div className={styles.stack}>
        <div className={styles.person}>
          {/* eslint-disable-next-line @next/next/no-img-element -- profile photo */}
          {draft.hostAvatar ? <img src={api.media.url(draft.hostAvatar) ?? ""} alt="" className={`${styles.avatar} ${styles.avatarLarge}`} /> : <span className={`${styles.avatar} ${styles.avatarLarge}`} aria-hidden />}
          <button type="button" className={styles.underlineButton} onClick={() => input.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : draft.hostAvatar ? "Change photo" : "Add a photo"}
          </button>
          <input
            ref={input}
            type="file"
            accept={ACCEPTED_PHOTOS}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className={styles.block}>
          <label className={styles.label} htmlFor="host-name">
            Display name
          </label>
          <input id="host-name" className={styles.input} value={draft.hostName} maxLength={80} onChange={(e) => set({ hostName: e.target.value })} />
        </div>
        <div className={styles.block}>
          <label className={styles.label} htmlFor="host-bio">
            Short bio
          </label>
          <textarea
            id="host-bio"
            className={styles.textBox}
            value={draft.hostBio}
            maxLength={500}
            placeholder="e.g. Born and raised inside the Walled City, I’ve been guiding food lovers for ten years."
            onChange={(e) => set({ hostBio: e.target.value })}
          />
        </div>
        <div className={styles.block}>
          <span className={styles.label} id="host-lang">
            Languages you speak
          </span>
          <button type="button" className={styles.fieldButton} aria-labelledby="host-lang" onClick={() => setSheet(true)}>
            <span className={draft.hostLanguages.length ? undefined : styles.placeholder}>
              {draft.hostLanguages.length ? draft.hostLanguages.map(languageLabel).join(", ") : "Choose languages"}
            </span>
          </button>
        </div>
      </div>
      <LanguageSheet open={sheet} value={draft.hostLanguages} onClose={() => setSheet(false)} onChange={(hostLanguages) => set({ hostLanguages })} />
    </div>
  );
}

/** Figma 616:4291 is a placeholder: summary with Edit links, previews, missing checklist, submit. */
export function ReviewStep({ draft, data, listing, live, goTo, notify, submitted, setSubmitted }: StepContext) {
  const api = useBrowserApi();
  const [busy, setBusy] = useState(false);
  if (!listing) return null;

  if (submitted) {
    const live = submitted.status === "published";
    return (
      <div className={styles.success} role="status">
        <span className={styles.successBadge} aria-hidden>
          ✓
        </span>
        <h2 className={styles.heading}>{live ? "Your listing is live" : "Submitted for review"}</h2>
        <p className={styles.lead}>
          {live
            ? "Guests can find and book it in the Moment app now."
            : data.business.status === "active"
              ? "Moment reviews new listings within 24 hours. We’ll let you know when it’s live."
              : "It will go live once your business is approved."}
        </p>
        <div className={styles.successActions}>
          <Link href={`/business/listings/${listing.id}`} className={styles.darkButton}>
            Go to Listing Details
          </Link>
          <Link href="/business/listings/new" className={styles.outlineButton}>
            Create another listing
          </Link>
        </div>
      </div>
    );
  }

  const steps = wizardSteps(draft.type).filter((s) => s !== "review" && s !== "type");
  // The host card must be saved (Your information), not just prefilled.
  const incomplete = steps.filter((s) => !stepValid(s, draft, live) || (s === "host" && !data.hostCard));
  const missing = listing.missing;
  const canSubmit = missing.length === 0 && incomplete.length === 0 && listing.status === "draft";
  const cover = listing.media[0] ? api.media.url(listing.media[0].url) : null;
  const category = data.categories.flatMap((g) => [g, ...g.children]).find((c) => c.id === draft.categoryId);
  const price = toMinor(draft.price);
  const priceText = price ? `${formatPrice(price)} ${draft.priceUnit === "per_person" ? "per person" : "per booking"}` : "Not set";

  const rows: { step: WizardStep; label: string; value: string }[] = [
    { step: "basics", label: "City and languages", value: `${draft.city || "No city"} · ${draft.languages.map(languageLabel).join(", ")}` },
    { step: "category", label: "Category", value: category?.name ?? "Not chosen" },
    { step: "title", label: "Title", value: draft.title || "Not set" },
    { step: "photos", label: "Photos", value: `${listing.media.length} photos` },
    { step: "details", label: "Description and duration", value: `${draft.description.slice(0, 90)}${draft.description.length > 90 ? "…" : ""} · ${durationLabel(draft.duration)}` },
    { step: "location", label: "Meeting point", value: [draft.street, draft.city, draft.province].filter(Boolean).join(", ") || "Not set" },
    { step: "provide", label: "What’s included", value: draft.includes.join(", ") || "Nothing listed" },
    ...(draft.type === "experience"
      ? [
          {
            step: "requirements" as const,
            label: "Guest requirements",
            value: [
              draft.minAge !== null ? `Age ${minAgeLabel(draft.minAge)}` : null,
              ACTIVITY_LEVELS.find((a) => a.value === draft.activity)?.label,
              SKILL_LEVELS.find((a) => a.value === draft.skill)?.label,
            ]
              .filter(Boolean)
              .join(" · ") || "Not set",
          },
          { step: "group" as const, label: "Group size", value: `Up to ${draft.maxGuests} · ${draft.privateMax ? `private up to ${draft.privateMax}` : "no private groups"}` },
        ]
      : [{ step: "staff" as const, label: "Staff", value: data.staff.filter((s) => draft.staffIds.includes(s.id)).map((s) => s.display_name).join(", ") || "No one chosen" }]),
    {
      step: "availability",
      label: "Availability",
      value: listing.hasAvailability ? (draft.type === "service" ? "Staff hours set" : `${draft.weekdays.length} days a week${listing.oneOffSessions.length ? ` + ${listing.oneOffSessions.length} dates` : ""}`) : "Not set",
    },
    { step: "booking", label: "Booking settings", value: `${draft.instantBook ? "Instant book" : "Request to book"} · ${cutoffLabel(draft.cutoff)} · ${CANCELLATION_POLICIES[draft.policy].label}` },
    { step: "pricing", label: "Price", value: priceText + (draft.options.length ? ` · ${draft.options.length} options` : "") },
    {
      step: "discount",
      label: "Discounts",
      value: [draft.groupOn ? `${draft.groupPercent}% for ${draft.groupMin}+ guests` : null, draft.earlyOn ? `${draft.earlyPercent}% booked ${draft.earlyDays}+ days ahead` : null].filter(Boolean).join(" · ") || "None",
    },
    { step: "host", label: "Host", value: draft.hostName || "Not set" },
  ];

  const submit = async () => {
    setBusy(true);
    const result = await submitListing(listing.id);
    setBusy(false);
    if ("error" in result) return notify(result.error, "error");
    setSubmitted(result);
  };

  return (
    <div className={`${styles.form} ${styles.wideForm}`}>
      <h2 className={styles.heading}>Review &amp; submit</h2>
      <p className={styles.lead}>Check everything once more. Moment reviews each new listing before guests can book it.</p>
      <div className={styles.stack}>
        <div className={styles.previewRow}>
          <div className={styles.block}>
            <span className={styles.label}>Listing card</span>
            <div className={styles.listingCard}>
              {/* eslint-disable-next-line @next/next/no-img-element -- cover */}
              {cover ? <img src={cover} alt="" /> : <div className={styles.photoUploading}>No photos yet</div>}
              <div className={styles.listingCardBody}>
                <span className={styles.cardTitle}>{draft.title || "Untitled"}</span>
                <span className={styles.hint}>
                  {category?.name ?? "No category"} · {draft.city || "No city"}
                </span>
                <span className={styles.choiceTitle}>{priceText}</span>
              </div>
            </div>
            <Link href={`/business/listings/${listing.id}/preview`} className={styles.underlineButton} target="_blank">
              Open the full customer preview
            </Link>
          </div>
          <div className={styles.block}>
            <span className={styles.label}>In the app</span>
            <div className={styles.phone} aria-hidden>
              <div className={styles.phoneScreen}>
                {/* eslint-disable-next-line @next/next/no-img-element -- cover */}
                {cover ? <img src={cover} alt="" /> : <div className={styles.photoUploading} />}
                <span className={styles.phoneTitle}>{draft.title || "Untitled"}</span>
                <span className={styles.hint}>{draft.city}</span>
                <span className={styles.phoneText}>{draft.description}</span>
                <span className={styles.choiceTitle}>{priceText}</span>
              </div>
            </div>
          </div>
        </div>

        {missing.length || incomplete.length ? (
          <div className={styles.panel} role="status">
            <span className={styles.label}>Still to do</span>
            <ul className={styles.missingList}>
              {[...new Map([...missing.map((m) => [m.step, m.label] as const), ...incomplete.map((s) => [s, stepLabel(s, draft.type)] as const)]).entries()].map(
                ([step, label]) => (
                  <li key={step}>
                    <button type="button" className={styles.underlineButton} onClick={() => goTo(step)}>
                      {label}
                    </button>
                  </li>
                ),
              )}
            </ul>
          </div>
        ) : null}

        <ul className={styles.summary} aria-label="Summary">
          {rows.map((r) => (
            <li key={r.step} className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{r.label}</span>
              <span className={styles.summaryValue}>{r.value}</span>
              <button type="button" className={styles.underlineButton} onClick={() => goTo(r.step)} aria-label={`Edit ${r.label.toLowerCase()}`}>
                Edit
              </button>
            </li>
          ))}
        </ul>

        {listing.status === "draft" ? (
          <>
            {data.business.status !== "active" ? <p className={styles.note}>Your business is under review: this listing will go live once your business is approved.</p> : null}
            <button type="button" className={styles.next} onClick={submit} disabled={!canSubmit || busy}>
              {busy ? <span className={styles.spinner} aria-hidden /> : null}
              Submit for review
            </button>
          </>
        ) : (
          <div className={styles.successActions} style={{ justifyContent: "flex-start" }}>
            <p className={styles.note}>
              {listing.status === "pending_review" ? "This listing is waiting for Moment’s review. Changes you make are saved and reviewed too." : "Changes are saved as you go and show in the app straight away."}
            </p>
            <Link href={`/business/listings/${listing.id}`} className={styles.darkButton}>
              Back to Listing Details
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
