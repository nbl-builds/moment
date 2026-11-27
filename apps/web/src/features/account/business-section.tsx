"use client";

import { findCity, PK_CITIES, PK_PROVINCES, type PortalBusinessProfile } from "@moment/shared";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import { ACCEPTED_PHOTOS, resizePhoto } from "@/features/listing-wizard/photos";
import styles from "./account.module.css";

const MapPicker = dynamic(() => import("@/features/listing-wizard/map-picker"), { ssr: false, loading: () => <div className={styles.coverThumb} aria-hidden /> });

/** business_hours: 0 = Sunday. Shown Monday first. */
const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const hhmm = (t: string) => t.slice(0, 5);

/**
 * Not in Figma: what guests see on the business page in the app. Owners edit
 * everything; managers edit opening hours and the gallery (the business row
 * and its address are owner-only, as in the database rules).
 */
export function BusinessSection({ data, canEditCore, toast }: { data: PortalBusinessProfile; canEditCore: boolean; toast: (m: string) => void }) {
  const api = useBrowserApi();
  const router = useRouter();
  const b = data.business;
  const businessId = b.id;

  const [name, setName] = useState(b.name);
  const [description, setDescription] = useState(b.description ?? "");
  const [logo, setLogo] = useState(b.logo_url);
  const [cover, setCover] = useState(b.cover_url);
  const [address, setAddress] = useState(data.location?.address_line1 ?? "");
  const [area, setArea] = useState(data.location?.area ?? "");
  const [city, setCity] = useState(data.location?.city ?? "Lahore");
  const [province, setProvince] = useState(data.location?.province ?? findCity(data.location?.city)?.province ?? "");
  const [postal, setPostal] = useState(data.location?.postal_code ?? "");
  const [pin, setPin] = useState(data.point);
  const [hours, setHours] = useState(() =>
    Object.fromEntries(DAYS.map((d) => {
      const h = data.hours.find((x) => x.weekday === d.value);
      return [d.value, h ? { open: true, opens: hhmm(h.opens_at), closes: hhmm(h.closes_at) } : { open: false, opens: "09:00", closes: "18:00" }];
    })) as Record<number, { open: boolean; opens: string; closes: string }>,
  );
  const [photos, setPhotos] = useState(data.photos);
  const [busy, setBusy] = useState<string | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const center = findCity(city) ?? PK_CITIES[1]!;

  const run = async (key: string, work: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await work();
      toast(done);
      router.refresh();
    } catch (error) {
      toast(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const uploadBrand = (kind: "logo" | "cover", file: File) =>
    run(kind, async () => {
      const url = await api.businessProfile.uploadBusinessMedia(businessId, "brand", await resizePhoto(file));
      await api.businessProfile.saveBusiness(businessId, kind === "logo" ? { logo_url: url } : { cover_url: url });
      if (kind === "logo") setLogo(url);
      else setCover(url);
    }, kind === "logo" ? "Logo updated." : "Cover updated.");

  const addPhotos = (files: FileList) =>
    run("gallery", async () => {
      let order = photos.length;
      const added: typeof photos = [];
      for (const f of [...files].slice(0, 12)) {
        const url = await api.businessProfile.uploadBusinessMedia(businessId, "gallery", await resizePhoto(f));
        added.push(await api.businessProfile.addPhoto(businessId, url, order++));
      }
      setPhotos((p) => [...p, ...added]);
    }, "Photos added.");

  return (
    <section aria-labelledby="business-title" style={{ marginTop: "var(--web-space-40)" }}>
      <h2 id="business-title" className={styles.pageTitle} style={{ marginTop: 0 }}>
        Business
      </h2>
      <p className={styles.muted}>This is your business page in the Moment app.{canEditCore ? "" : " Only the owner can change the name, logo, cover, description and address."}</p>

      <div className={styles.cards}>
        <div className={styles.panelCard}>
          <h3 className={styles.panelHeading}>Brand</h3>
          <div className={styles.businessGrid} style={{ marginTop: "var(--web-space-20)" }}>
            <div className={styles.brand}>
              {/* eslint-disable-next-line @next/next/no-img-element -- logo */}
              {logo ? <img src={api.media.url(logo) ?? ""} alt="Logo" className={styles.logo} /> : <span className={styles.logo} aria-hidden />}
              {canEditCore ? (
                <button type="button" className={styles.outline} onClick={() => logoInput.current?.click()} disabled={busy === "logo"}>
                  {busy === "logo" ? "Uploading…" : "Change logo"}
                </button>
              ) : null}
              <input ref={logoInput} type="file" accept={ACCEPTED_PHOTOS} hidden aria-label="Logo" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadBrand("logo", f); e.target.value = ""; }} />
            </div>
            <div className={styles.field}>
              {/* eslint-disable-next-line @next/next/no-img-element -- cover */}
              {cover ? <img src={api.media.url(cover) ?? ""} alt="Business cover" className={styles.coverThumb} /> : <span className={styles.coverThumb} aria-hidden />}
              {canEditCore ? (
                <button type="button" className={styles.outline} onClick={() => coverInput.current?.click()} disabled={busy === "cover"}>
                  {busy === "cover" ? "Uploading…" : "Change cover"}
                </button>
              ) : null}
              <input ref={coverInput} type="file" accept={ACCEPTED_PHOTOS} hidden aria-label="Business cover" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadBrand("cover", f); e.target.value = ""; }} />
            </div>
          </div>
          <div className={styles.editForm} style={{ maxWidth: "none" }}>
            <label className={styles.field}>
              <span className={styles.label}>Business name</span>
              <input className={styles.input} value={name} maxLength={120} disabled={!canEditCore} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Description</span>
              <textarea className={styles.textarea} value={description} maxLength={2000} disabled={!canEditCore} onChange={(e) => setDescription(e.target.value)} />
            </label>
            {canEditCore ? (
              <div className={styles.formRow}>
                <button
                  type="button"
                  className={styles.dark}
                  disabled={busy === "brand" || name.trim().length < 2}
                  onClick={() => run("brand", () => api.businessProfile.saveBusiness(businessId, { name: name.trim(), description: description.trim() || null }), "Business details saved.")}
                >
                  {busy === "brand" ? "Saving…" : "Save details"}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.panelCard}>
          <h3 className={styles.panelHeading}>Address</h3>
          <div className={styles.editForm} style={{ maxWidth: "none" }}>
            <label className={styles.field}>
              <span className={styles.label}>Street address</span>
              <input className={styles.input} value={address} maxLength={200} disabled={!canEditCore} onChange={(e) => setAddress(e.target.value)} />
            </label>
            <div className={styles.businessGrid}>
              <label className={styles.field}>
                <span className={styles.label}>Area</span>
                <input className={styles.input} value={area} maxLength={80} disabled={!canEditCore} placeholder="e.g. Gulberg III" onChange={(e) => setArea(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>City</span>
                <select className={styles.select} value={city} disabled={!canEditCore} onChange={(e) => { setCity(e.target.value); setProvince(findCity(e.target.value)?.province ?? province); setPin(null); }}>
                  {PK_CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Province</span>
                <select className={styles.select} value={province} disabled={!canEditCore} onChange={(e) => setProvince(e.target.value)}>
                  <option value="">Select province</option>
                  {PK_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Postal code</span>
                <input className={styles.input} value={postal} inputMode="numeric" maxLength={5} disabled={!canEditCore} placeholder="Optional" onChange={(e) => setPostal(e.target.value.replace(/\D/g, ""))} />
              </label>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Map pin</span>
              {canEditCore ? <MapPicker center={center} pin={pin} onChange={setPin} /> : null}
              <span className={styles.small}>{pin ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)} · used for distance and the map in the app.` : "No pin yet: click the map."}</span>
            </div>
            {canEditCore ? (
              <div className={styles.formRow}>
                <button
                  type="button"
                  className={styles.dark}
                  disabled={busy === "address" || address.trim().length < 5}
                  onClick={() =>
                    run(
                      "address",
                      () =>
                        api.businessProfile.saveLocation({
                          businessId,
                          locationId: data.location?.id ?? null,
                          address: address.trim(),
                          area: area.trim() || null,
                          city,
                          province: province || null,
                          postalCode: postal || null,
                          pin,
                        }),
                      "Address saved.",
                    )
                  }
                >
                  {busy === "address" ? "Saving…" : "Save address"}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.panelCard}>
          <h3 className={styles.panelHeading}>Opening hours</h3>
          <div className={styles.hours} style={{ marginTop: "var(--web-space-20)" }}>
            {DAYS.map((d) => {
              const h = hours[d.value]!;
              return (
                <div key={d.value} className={styles.hourRow}>
                  <label className={styles.check}>
                    <input type="checkbox" checked={h.open} onChange={(e) => setHours({ ...hours, [d.value]: { ...h, open: e.target.checked } })} />
                    {d.label}
                  </label>
                  {h.open ? (
                    <>
                      <input type="time" className={styles.input} aria-label={`${d.label} opens`} value={h.opens} step={900} onChange={(e) => setHours({ ...hours, [d.value]: { ...h, opens: e.target.value } })} />
                      <input type="time" className={styles.input} aria-label={`${d.label} closes`} value={h.closes} step={900} onChange={(e) => setHours({ ...hours, [d.value]: { ...h, closes: e.target.value } })} />
                    </>
                  ) : (
                    <span className={styles.small}>Closed</span>
                  )}
                </div>
              );
            })}
            <p className={styles.small}>Closing after midnight? Set a closing time earlier than the opening time (e.g. 6 PM to 2 AM).</p>
            <div className={styles.formRow}>
              <button
                type="button"
                className={styles.dark}
                disabled={busy === "hours"}
                onClick={() =>
                  run(
                    "hours",
                    () =>
                      api.businessProfile.saveHours(
                        businessId,
                        DAYS.filter((d) => hours[d.value]!.open).map((d) => ({ weekday: d.value, opens: hours[d.value]!.opens, closes: hours[d.value]!.closes })),
                      ),
                    "Opening hours saved.",
                  )
                }
              >
                {busy === "hours" ? "Saving…" : "Save hours"}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.panelCard}>
          <h3 className={styles.panelHeading}>Gallery</h3>
          <div className={styles.stack} style={{ marginTop: "var(--web-space-20)" }}>
            {photos.length ? (
              <ul className={styles.gallery} aria-label="Gallery">
                {photos.map((p, i) => (
                  <li key={p.id} className={styles.galleryItem}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- gallery photo */}
                    <img src={api.media.url(p.url) ?? ""} alt={p.alt ?? `Photo ${i + 1}`} />
                    <button type="button" onClick={() => run(`photo-${p.id}`, async () => { await api.businessProfile.removePhoto(p); setPhotos((x) => x.filter((y) => y.id !== p.id)); }, "Photo removed.")} aria-label={`Remove photo ${i + 1}`}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.small}>No photos yet. Add photos of your place, team and work.</p>
            )}
            <div className={styles.formRow}>
              <button type="button" className={styles.outline} onClick={() => galleryInput.current?.click()} disabled={busy === "gallery"}>
                {busy === "gallery" ? "Uploading…" : "Add photos"}
              </button>
              <input ref={galleryInput} type="file" accept={ACCEPTED_PHOTOS} multiple hidden aria-label="Gallery photos" onChange={(e) => { if (e.target.files?.length) void addPhotos(e.target.files); e.target.value = ""; }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
