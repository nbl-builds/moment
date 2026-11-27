"use client";

import {
  ACTIVITY_LEVELS,
  DURATION_OPTIONS,
  durationLabel,
  findCity,
  LISTING_DESCRIPTION_MAX,
  LISTING_INCLUDES_MAX,
  LISTING_PHOTOS_MAX,
  LISTING_TITLE_MAX,
  MIN_AGE_OPTIONS,
  minAgeLabel,
  PK_CITIES,
  PK_PROVINCES,
  PROVIDE_SUGGESTIONS,
  PUBLISH_MIN_DESCRIPTION,
  PUBLISH_MIN_PHOTOS,
  SKILL_LEVELS,
} from "@moment/shared";
import dynamic from "next/dynamic";
import { useRef, useState, type DragEvent } from "react";
import { PortalIcon } from "@/components/portal/icon";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import { ACCEPTED_PHOTOS, resizePhoto } from "../photos";
import type { StepContext } from "../wizard";
import styles from "../wizard.module.css";

const MapPicker = dynamic(() => import("../map-picker"), { ssr: false, loading: () => <div className={styles.map} aria-hidden /> });

/** Figma 615:2912: name box with a 60-character counter. */
export function TitleStep({ draft, set }: StepContext) {
  const noun = draft.type === "service" ? "service" : "experience";
  const length = draft.title.length;
  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>Let’s give your {noun} a name</h2>
      <p className={styles.lead}>Make it descriptive and unique so guests will understand what you’re offering.</p>
      <div className={styles.stack}>
        <label className={styles.srOnly} htmlFor="title">
          Title
        </label>
        <textarea
          id="title"
          className={styles.textBox}
          value={draft.title}
          maxLength={LISTING_TITLE_MAX}
          placeholder={draft.type === "service" ? "e.g. Signature hot stone massage" : "e.g. Walled City food walk at dusk"}
          onChange={(e) => set({ title: e.target.value.replace(/\n/g, " ") })}
        />
      </div>
      <p className={styles.counter} aria-live="polite">
        {length}/{LISTING_TITLE_MAX}
      </p>
    </div>
  );
}

/** Figma 615:3179 (drop zone) and 615:3270 ("How does it look?" grid). */
export function PhotosStep({ listing, data, refresh, notify }: StepContext) {
  const api = useBrowserApi();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [mode, setMode] = useState<"grid" | "upload">(listing?.media.length ? "grid" : "upload");
  if (!listing) return null;
  const media = listing.media;

  const upload = async (files: FileList | File[]) => {
    const list = [...files].slice(0, Math.max(0, LISTING_PHOTOS_MAX - media.length));
    if (list.length === 0) return notify(`Up to ${LISTING_PHOTOS_MAX} photos.`, "error");
    setUploading(list.length);
    setMode("grid");
    let order = media.length;
    for (const file of list) {
      try {
        const resized = await resizePhoto(file);
        await api.listingEditor.uploadPhoto({ businessId: data.business.id, listingId: listing.id, file: resized, sortOrder: order++ });
      } catch (error) {
        notify(errorMessage(error), "error");
      }
      setUploading((n) => n - 1);
    }
    await refresh();
  };

  const reorder = async (ids: string[]) => {
    try {
      await api.listingEditor.reorderPhotos(ids);
      await refresh();
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  };

  const move = (id: string, to: number) => {
    const ids = media.map((m) => m.id).filter((x) => x !== id);
    ids.splice(to, 0, id);
    void reorder(ids);
  };

  const remove = async (m: (typeof media)[number]) => {
    try {
      await api.listingEditor.deletePhoto(m);
      await refresh();
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
  };

  const picker = (
    <input
      ref={input}
      type="file"
      accept={ACCEPTED_PHOTOS}
      multiple
      hidden
      data-testid="photo-input"
      onChange={(e) => {
        if (e.target.files?.length) void upload(e.target.files);
        e.target.value = "";
      }}
    />
  );

  if (mode === "upload" || (media.length === 0 && uploading === 0)) {
    return (
      <div className={styles.form}>
        <h2 className={styles.heading}>Add your photos</h2>
        <p className={styles.lead}>We’ll review every photo before it goes live on your {listing.type} page.</p>
        <div
          className={styles.dropZone}
          data-over={over ? "true" : undefined}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <PortalIcon name="image-add-50" />
          <p className={styles.dropTitle}>Drag your photo here</p>
          <p className={styles.dropText}>Add at least {PUBLISH_MIN_PHOTOS} photos</p>
        </div>
        <div className={styles.linkRow} style={{ marginTop: "var(--web-space-16)" }}>
          <button type="button" className={styles.underlineButton} onClick={() => input.current?.click()}>
            Upload from device
          </button>
        </div>
        {picker}
      </div>
    );
  }

  return (
    <div className={styles.form} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <h2 className={styles.heading}>How does it look?</h2>
      <div className={styles.linkRow} style={{ justifyContent: "space-between", marginTop: "var(--web-space-12)" }}>
        <button type="button" className={styles.underlineButton} onClick={() => input.current?.click()}>
          Upload Again
        </button>
        <span className={styles.hint}>
          {media.length} of {PUBLISH_MIN_PHOTOS}+ photos · drag to reorder
        </span>
      </div>
      {picker}
      <ul className={styles.photoGrid}>
        {media.map((m, i) => (
          <li
            key={m.id}
            className={styles.photo}
            draggable
            data-dragging={dragId === m.id ? "true" : undefined}
            onDragStart={() => setDragId(m.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dragId && dragId !== m.id) move(dragId, i);
              setDragId(null);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo, already resized */}
            <img src={api.media.url(m.url) ?? ""} alt={`Photo ${i + 1}`} />
            {i === 0 ? <span className={styles.photoBadge}>Cover photo</span> : null}
            <div className={styles.photoTools}>
              <span style={{ display: "flex", gap: "var(--web-space-6)" }}>
                <button type="button" className={styles.photoTool} disabled={i === 0} onClick={() => move(m.id, i - 1)} aria-label={`Move photo ${i + 1} earlier`}>
                  ←
                </button>
                <button type="button" className={styles.photoTool} disabled={i === media.length - 1} onClick={() => move(m.id, i + 1)} aria-label={`Move photo ${i + 1} later`}>
                  →
                </button>
              </span>
              <span style={{ display: "flex", gap: "var(--web-space-6)" }}>
                {i > 0 ? (
                  <button type="button" className={styles.photoTool} onClick={() => move(m.id, 0)}>
                    Set as cover
                  </button>
                ) : null}
                <button type="button" className={styles.photoTool} onClick={() => remove(m)} aria-label={`Delete photo ${i + 1}`}>
                  Delete
                </button>
              </span>
            </div>
          </li>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <li key={`up-${i}`} className={styles.photoUploading} aria-live="polite">
            Uploading…
          </li>
        ))}
      </ul>
      {media.length < PUBLISH_MIN_PHOTOS && uploading === 0 ? (
        <p className={styles.hint} style={{ marginTop: "var(--web-space-16)" }}>
          Add {PUBLISH_MIN_PHOTOS - media.length} more to continue.
        </p>
      ) : null}
    </div>
  );
}

/** Figma 615:3361: description + duration. */
export function DetailsStep({ draft, set }: StepContext) {
  const noun = draft.type === "service" ? "service" : "experience";
  const length = draft.description.trim().length;
  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>Let’s describe your {noun}</h2>
      <p className={styles.lead}>Tell guests what makes it special: what they’ll do, see and take home.</p>
      <div className={styles.stack}>
        <div className={styles.block}>
          <label className={styles.srOnly} htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className={`${styles.textBox} ${styles.textBoxTall}`}
            value={draft.description}
            maxLength={LISTING_DESCRIPTION_MAX}
            placeholder={`Tell guests the story of what they will do during your ${noun}.`}
            onChange={(e) => set({ description: e.target.value })}
          />
          <p className={styles.counter} data-warn={length > 0 && length < PUBLISH_MIN_DESCRIPTION ? "true" : undefined} style={{ marginTop: 0 }}>
            {length < PUBLISH_MIN_DESCRIPTION ? `${length}/${PUBLISH_MIN_DESCRIPTION} minimum` : `${length}/${LISTING_DESCRIPTION_MAX}`}
          </p>
        </div>
        <div className={styles.block}>
          <label className={styles.label} htmlFor="duration">
            How long is your {noun}?
          </label>
          <select id="duration" className={styles.select} value={draft.duration} onChange={(e) => set({ duration: Number(e.target.value) })}>
            {DURATION_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {durationLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

/** Figma 616:3462: street, city, province, postal code, country, plus a map pin. */
export function LocationStep({ draft, set }: StepContext) {
  const city = findCity(draft.city) ?? PK_CITIES[0]!;
  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>Where should guests meet you?</h2>
      <div className={styles.stack}>
        <div className={styles.block}>
          <label className={styles.label} htmlFor="street">
            Street Address
          </label>
          <input id="street" className={styles.input} value={draft.street} maxLength={200} placeholder="Enter street address" onChange={(e) => set({ street: e.target.value })} />
        </div>
        <div className={styles.block}>
          <label className={styles.label} htmlFor="loc-city">
            City
          </label>
          <select
            id="loc-city"
            className={styles.select}
            data-empty={draft.city ? undefined : "true"}
            value={draft.city}
            onChange={(e) => {
              const next = findCity(e.target.value);
              set({ city: e.target.value, province: next?.province ?? draft.province, pin: null });
            }}
          >
            <option value="" disabled>
              Select city
            </option>
            {PK_CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.row2}>
          <div className={styles.block}>
            <label className={styles.label} htmlFor="province">
              Province
            </label>
            <select id="province" className={styles.select} data-empty={draft.province ? undefined : "true"} value={draft.province} onChange={(e) => set({ province: e.target.value })}>
              <option value="" disabled>
                Select province
              </option>
              {PK_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.block}>
            <label className={styles.label} htmlFor="postal">
              Postal Code
            </label>
            <input
              id="postal"
              className={styles.input}
              inputMode="numeric"
              value={draft.postalCode}
              maxLength={5}
              placeholder="Optional"
              onChange={(e) => set({ postalCode: e.target.value.replace(/\D/g, "") })}
            />
          </div>
        </div>
        <div className={styles.block}>
          <label className={styles.label} htmlFor="country">
            Select your country
          </label>
          <select id="country" className={styles.select} value="PK" disabled>
            <option value="PK">Pakistan</option>
          </select>
        </div>
        <div className={styles.block}>
          <span className={styles.label}>Pin the exact meeting point</span>
          <span className={styles.hint}>Guests see this on the map and use it for directions and distance.</span>
          <MapPicker center={city} pin={draft.pin} onChange={(pin) => set({ pin })} />
          <div className={styles.linkRow} style={{ justifyContent: "space-between" }}>
            <span className={styles.hint}>{draft.pin ? `${draft.pin.lat.toFixed(5)}, ${draft.pin.lng.toFixed(5)}` : "No pin yet: click the map."}</span>
            {!draft.pin ? (
              <button type="button" className={styles.underlineButton} onClick={() => set({ pin: { lat: city.lat, lng: city.lng } })}>
                Pin {city.name} centre
              </button>
            ) : null}
          </div>
        </div>
        <div className={styles.block}>
          <label className={styles.label} htmlFor="notes">
            Directions for guests (optional)
          </label>
          <textarea
            id="notes"
            className={`${styles.textBox} ${styles.textBoxShort}`}
            value={draft.notes}
            maxLength={300}
            placeholder="e.g. Meet under the arch of Delhi Gate, look for the lime Moment flag."
            onChange={(e) => set({ notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

/** Figma 616:3710, as a list of what's included. */
export function ProvideStep({ draft, set }: StepContext) {
  const [text, setText] = useState("");
  const add = (item: string) => {
    const v = item.trim();
    if (!v || draft.includes.some((i) => i.toLowerCase() === v.toLowerCase()) || draft.includes.length >= LISTING_INCLUDES_MAX) return;
    set({ includes: [...draft.includes, v] });
    setText("");
  };
  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>Add details about what you will provide</h2>
      <p className={styles.lead}>Food, drinks, equipment, transport: list everything that’s included in the price.</p>
      <div className={styles.stack}>
        <form
          className={styles.addRow}
          onSubmit={(e) => {
            e.preventDefault();
            add(text);
          }}
        >
          <label className={styles.srOnly} htmlFor="provide">
            Item
          </label>
          <input id="provide" className={styles.input} value={text} maxLength={60} placeholder="e.g. Lassi and halwa puri" onChange={(e) => setText(e.target.value)} />
          <button type="submit" className={styles.smallButton} disabled={!text.trim()}>
            Add
          </button>
        </form>
        <div className={styles.chips} aria-label="Quick add">
          {PROVIDE_SUGGESTIONS.filter((s) => !draft.includes.includes(s)).map((s) => (
            <button key={s} type="button" className={`${styles.chip} ${styles.chipSmall}`} onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
        {draft.includes.length ? (
          <ul className={styles.itemList} aria-label="Included">
            {draft.includes.map((item) => (
              <li key={item} className={styles.item}>
                {item}
                <button type="button" className={styles.removeButton} onClick={() => set({ includes: draft.includes.filter((i) => i !== item) })} aria-label={`Remove ${item}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>Add at least one item.</p>
        )}
      </div>
    </div>
  );
}

/** Figma 616:3823: minimum age, activity level, skill level. */
export function RequirementsStep({ draft, set }: StepContext) {
  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>Who can attend your experience?</h2>
      <p className={styles.lead}>
        Keep in mind that someone booking your experience might book spots for other guests. If there are strict requirements around age, skill level, or
        certifications, include them here.
      </p>
      <div className={styles.stack}>
        <div className={styles.block}>
          <label className={styles.label} htmlFor="age">
            Minimum Age
          </label>
          <select
            id="age"
            className={styles.select}
            data-empty={draft.minAge === null ? "true" : undefined}
            value={draft.minAge ?? ""}
            onChange={(e) => set({ minAge: Number(e.target.value) })}
          >
            <option value="" disabled>
              Set age limit
            </option>
            {MIN_AGE_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {minAgeLabel(a)}
              </option>
            ))}
          </select>
        </div>
        <ChipGroup
          id="activity"
          label="What activity level should people expect?"
          hint="Think about how active people will get during your entire experience."
          options={ACTIVITY_LEVELS}
          value={draft.activity}
          onChange={(activity) => set({ activity })}
        />
        <ChipGroup
          id="skill"
          label="What skill level is required?"
          hint="Think about how experienced people should be to take your activity."
          options={SKILL_LEVELS}
          value={draft.skill}
          onChange={(skill) => set({ skill })}
        />
      </div>
    </div>
  );
}

function ChipGroup({
  id,
  label,
  hint,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  options: readonly { value: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className={styles.block}>
      <span className={styles.label} id={`${id}-label`}>
        {label}
      </span>
      <span className={styles.hint}>{hint}</span>
      <div className={styles.chips} role="radiogroup" aria-labelledby={`${id}-label`} style={{ marginTop: "var(--web-space-10)" }}>
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={styles.chip} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
