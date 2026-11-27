"use client";

import { findCity, LISTING_LANGUAGES, languageLabel, nearestCity, PK_CITIES } from "@moment/shared";
import { useState } from "react";
import { PortalIcon } from "@/components/portal/icon";
import { Sheet } from "@/components/portal/sheet";
import { CATEGORY_ICONS } from "@/lib/business/categories";
import type { StepContext } from "../wizard";
import styles from "../wizard.module.css";

const KINDS = [
  {
    value: "experience",
    title: "Experience",
    text: "Tours, walks, workshops and activities you host at set times for a group of guests.",
    icon: "icon-user",
  },
  {
    value: "service",
    title: "Service",
    text: "Appointments with your staff: spa, salon, grooming, wellness and other one-to-one services.",
    icon: "icon-briefcase",
  },
] as const;

/** Figma 614:2157 ("Tell us about yourself" cards, reused as Experience / Service). */
export function TypeStep({ draft, set, listing }: StepContext) {
  const locked = Boolean(listing && listing.status !== "draft");
  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>What are you listing?</h2>
      <p className={styles.lead}>Each listing is vetted for quality by a team of editors before it makes its way onto the platform.</p>
      <ul className={styles.typeList} role="radiogroup" aria-label="Listing type">
        {KINDS.map((k) => (
          <li key={k.value}>
            <button
              type="button"
              role="radio"
              aria-checked={draft.type === k.value}
              className={styles.typeCard}
              disabled={locked && draft.type !== k.value}
              onClick={() => set({ type: k.value })}
            >
              <span className={styles.typeIcon}>
                <PortalIcon name={k.icon} />
              </span>
              <span className={styles.typeText}>
                <span className={styles.cardTitle}>{k.title}</span>
                <span className={styles.cardText}>{k.text}</span>
              </span>
              <span className={styles.typeChevron}>
                <PortalIcon name="direction-right" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {locked ? <p className={`${styles.hint} ${styles.stack}`}>The type can&apos;t change once a listing has been submitted.</p> : null}
    </div>
  );
}

/** Figma 615:2507: city + "Use my current location", languages. */
export function BasicsStep({ draft, set, notify }: StepContext) {
  const [locating, setLocating] = useState(false);
  const [sheet, setSheet] = useState(false);
  const noun = draft.type === "service" ? "service" : "experience";

  const locate = () => {
    if (!navigator.geolocation) return notify("Your browser can't share its location.", "error");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const city = nearestCity(pos.coords.latitude, pos.coords.longitude);
        set({ city: city.name, province: city.province });
        setLocating(false);
      },
      () => {
        setLocating(false);
        notify("Couldn't get your location. Pick your city from the list.", "error");
      },
      { timeout: 10000 },
    );
  };

  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>Tell us a bit more</h2>
      <div className={styles.stack}>
        <div className={styles.block}>
          <label className={styles.label} htmlFor="city">
            Which city do you want to host your {noun} in?
          </label>
          <select
            id="city"
            className={styles.select}
            data-empty={draft.city ? undefined : "true"}
            value={draft.city}
            onChange={(e) => set({ city: e.target.value, province: findCity(e.target.value)?.province ?? draft.province })}
          >
            <option value="" disabled>
              Select your city
            </option>
            {PK_CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <div className={styles.linkRow}>
            <button type="button" className={styles.underlineButton} onClick={locate} disabled={locating}>
              <PortalIcon name="location-share" />
              {locating ? "Finding you…" : "Use my current location"}
            </button>
          </div>
        </div>

        <div className={styles.block}>
          <span className={styles.label} id="languages-label">
            Which language(s) will you offer your {noun} in?
          </span>
          <span className={styles.hint}>You should be able to read, write, and speak in this language.</span>
          <button type="button" className={styles.fieldButton} aria-labelledby="languages-label" aria-haspopup="dialog" onClick={() => setSheet(true)}>
            <span className={draft.languages.length ? undefined : styles.placeholder}>
              {draft.languages.length ? draft.languages.map(languageLabel).join(", ") : "Choose languages"}
            </span>
            <PortalIcon name="direction-right" />
          </button>
        </div>
      </div>

      <LanguageSheet open={sheet} value={draft.languages} onClose={() => setSheet(false)} onChange={(languages) => set({ languages })} />
    </div>
  );
}

export function LanguageSheet({ open, value, onChange, onClose }: { open: boolean; value: string[]; onChange: (v: string[]) => void; onClose: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Languages"
      footer={
        <button type="button" className={`${styles.next} ${styles.full}`} onClick={onClose}>
          Done
        </button>
      }
    >
      <ul className={styles.choiceList}>
        {LISTING_LANGUAGES.map((l) => {
          const on = value.includes(l.code);
          return (
            <li key={l.code}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                className={styles.choice}
                onClick={() => onChange(on ? value.filter((c) => c !== l.code) : [...value, l.code])}
              >
                <span className={`${styles.radio} ${styles.checkbox}`} aria-hidden />
                <span className={styles.choiceTitle}>{l.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/** Figma 615:2633: category group tiles, then the subcategory when the group has several. */
export function CategoryStep({ draft, set, data }: StepContext) {
  const groupOf = (id: string | null) => data.categories.find((g) => g.id === id || g.children.some((c) => c.id === id));
  const [groupId, setGroupId] = useState(groupOf(draft.categoryId)?.id ?? null);
  const group = data.categories.find((g) => g.id === groupId);

  const pickGroup = (g: (typeof data.categories)[number]) => {
    setGroupId(g.id);
    // One subcategory (or none): the tile is the choice.
    if (g.children.length <= 1) set({ categoryId: g.children[0]?.id ?? g.id });
    else if (!g.children.some((c) => c.id === draft.categoryId)) set({ categoryId: null });
  };

  return (
    <div className={styles.form}>
      <h2 className={styles.heading}>What is your main focus area?</h2>
      <ul className={styles.tiles} role="radiogroup" aria-label="Category">
        {data.categories.map((g) => (
          <li key={g.id}>
            <button type="button" role="radio" aria-checked={g.id === groupId} className={styles.tile} onClick={() => pickGroup(g)}>
              <span className={styles.tileIcon}>{CATEGORY_ICONS[g.slug] ? <PortalIcon name={CATEGORY_ICONS[g.slug]!} /> : null}</span>
              <span className={`${styles.cardTitle} ${styles.tileTitle}`}>{g.name}</span>
              <span className={`${styles.cardText} ${styles.tileText}`}>{g.description}</span>
            </button>
          </li>
        ))}
      </ul>
      {group && group.children.length > 1 ? (
        <div className={`${styles.block} ${styles.stack}`}>
          <span className={styles.label} id="sub-label">
            Which one fits best?
          </span>
          <div className={styles.chips} role="radiogroup" aria-labelledby="sub-label">
            {group.children.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={draft.categoryId === c.id} className={`${styles.chip} ${styles.chipSmall}`} onClick={() => set({ categoryId: c.id })}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
