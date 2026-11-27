"use client";

import { formatPkPhone, LISTING_LANGUAGES, type PortalBusinessProfile, type PortalMe } from "@moment/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PortalIcon } from "@/components/portal/icon";
import { Sheet } from "@/components/portal/sheet";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import { ACCEPTED_PHOTOS, resizePhoto } from "@/features/listing-wizard/photos";
import { BusinessSection } from "./business-section";
import { getVerificationStatus, submitIdentityVerification, type VerificationStatus } from "./mock";
import { useToast } from "@/components/portal/toast";
import styles from "./account.module.css";

const ABOUT_PREVIEW = 420;

/** Figma 629:7232 (Profile, About Me) plus the Business section (not in Figma). */
export function ProfileView({
  me,
  business,
  businessId,
  role,
}: {
  me: PortalMe;
  business: PortalBusinessProfile | null;
  businessId: string;
  role: "owner" | "manager" | "staff";
}) {
  const api = useBrowserApi();
  const router = useRouter();
  const toast = useToast();
  const coverInput = useRef<HTMLInputElement>(null);
  const [cover, setCover] = useState(me.card?.cover_url ?? null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [verification, setVerification] = useState<VerificationStatus>(me.profile.identity_verified_at ? "verified" : "none");
  useEffect(() => {
    if (!me.profile.identity_verified_at) void getVerificationStatus().then(setVerification);
  }, [me.profile.identity_verified_at]);

  const name = me.profile.display_name ?? "Your name";
  const bio = me.card?.bio ?? me.profile.bio ?? "";
  const avatar = api.media.url(me.card?.avatar_url ?? me.profile.avatar_url);
  const joined = new Date(me.createdAt).getFullYear();

  const changeCover = async (file: File) => {
    setCoverBusy(true);
    try {
      const resized = await resizePhoto(file);
      const url = await api.businessProfile.uploadBusinessMedia(businessId, "staff", resized);
      await api.businessProfile.saveCover({ businessId, coverUrl: url });
      setCover(url);
      toast("Cover photo updated.");
    } catch (error) {
      toast(errorMessage(error));
    } finally {
      setCoverBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.cover}>
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded cover */}
        {cover ? <img src={api.media.url(cover) ?? ""} alt="" /> : null}
        <button type="button" className={`${styles.whiteButton} ${styles.coverButton}`} onClick={() => coverInput.current?.click()} disabled={coverBusy}>
          <PortalIcon name="camera-20" />
          {coverBusy ? "Uploading…" : "Edit cover photo"}
        </button>
        <input
          ref={coverInput}
          type="file"
          accept={ACCEPTED_PHOTOS}
          hidden
          aria-label="Cover photo"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void changeCover(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className={styles.identity}>
        <div className={styles.avatar}>
          {/* eslint-disable-next-line @next/next/no-img-element -- profile photo */}
          {avatar ? <img src={avatar} alt={name} /> : null}
        </div>
        <div className={styles.nameBlock}>
          <div>
            <h1 className={styles.name}>{name}</h1>
            <p className={styles.muted}>Joined in {joined}</p>
          </div>
          <button type="button" className={styles.linkButton} onClick={() => setEditing(true)}>
            Edit profile
          </button>
        </div>
      </div>

      <div className={styles.columns}>
        <section aria-labelledby="about-title">
          <h2 id="about-title" className={styles.sectionTitle}>
            About me
          </h2>
          <div className={`${styles.card} ${styles.about}`}>
            {bio ? (
              <>
                {aboutOpen || bio.length <= ABOUT_PREVIEW ? bio : `${bio.slice(0, ABOUT_PREVIEW).trimEnd()}… `}
                {bio.length > ABOUT_PREVIEW ? (
                  <button type="button" className={styles.linkButton} onClick={() => setAboutOpen((o) => !o)}>
                    {aboutOpen ? " Show less" : "Read more"}
                  </button>
                ) : null}
              </>
            ) : (
              <>
                Tell guests who you are: where you&apos;re from, what you love about hosting, the languages you speak.{" "}
                <button type="button" className={styles.linkButton} onClick={() => setEditing(true)}>
                  Add a bio
                </button>
              </>
            )}
          </div>
        </section>

        <div>
          <section aria-labelledby="idv-title">
            <h2 id="idv-title" className={styles.sectionTitle}>
              Identity Verification
            </h2>
            <div className={`${styles.card} ${styles.rowCard}`} style={{ marginTop: "var(--web-space-20)" }}>
              <span className={styles.rowIcon}>
                <PortalIcon name="security-50" />
              </span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>Identity verification</span>
                <span className={styles.small}>
                  {verification === "verified"
                    ? "Verified. Guests see the badge on your profile."
                    : verification === "in_review"
                      ? "We’re checking your documents. This usually takes a day."
                      : "Show others you’re really you with the identity verification badge."}
                </span>
              </span>
              {verification === "none" ? (
                <button type="button" className={styles.outline} onClick={() => setVerifyOpen(true)}>
                  Verify Now
                </button>
              ) : (
                <span className={styles.outline} aria-disabled>
                  {verification === "verified" ? "Verified" : "In review"}
                </span>
              )}
            </div>
          </section>

          <section aria-labelledby="confirm-title" style={{ marginTop: "var(--web-space-20)" }}>
            <h2 id="confirm-title" className={styles.sectionTitle}>
              Confirmation
            </h2>
            <div className={styles.stack} style={{ marginTop: "var(--web-space-20)" }}>
              <div className={`${styles.card} ${styles.rowCard}`}>
                <span className={styles.rowIcon}>
                  <PortalIcon name="calling-50" />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>Phone Number</span>
                  <span className={styles.small}>{me.phone ? `${formatPkPhone(me.phone)} · guests and Moment can reach you here.` : "Add a phone number so guests and Moment can reach you."}</span>
                </span>
                {me.phone && me.phoneConfirmed ? (
                  <span className={styles.outline}>Verified</span>
                ) : (
                  <a href="/business/settings/personal" className={styles.outlineDanger}>
                    Let’s verify
                  </a>
                )}
              </div>
              <div className={`${styles.card} ${styles.rowCard}`}>
                <span className={styles.rowIcon}>
                  <PortalIcon name="mail-50" />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>Email</span>
                  <span className={styles.small}>{me.email ? `${me.email} · booking and payout emails go here.` : "Add an email for booking and payout emails."}</span>
                </span>
                {me.email && me.emailConfirmed ? (
                  <span className={styles.outline}>Verified</span>
                ) : (
                  <button type="button" className={styles.outlineDanger} onClick={() => setEmailOpen(true)}>
                    Let’s verify
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {business && role !== "staff" ? <BusinessSection data={business} canEditCore={role === "owner"} toast={toast} /> : null}

      <EditProfileSheet open={editing} onClose={() => setEditing(false)} me={me} businessId={businessId} onSaved={() => { toast("Profile saved."); router.refresh(); }} />
      <VerifySheet open={verifyOpen} onClose={() => setVerifyOpen(false)} onDone={(s) => { setVerification(s); toast("Documents sent. We’ll review them within a day."); }} />
      <EmailSheet open={emailOpen} onClose={() => setEmailOpen(false)} current={me.email} onDone={() => { toast("Email verified."); router.refresh(); }} />
    </div>
  );
}

function EditProfileSheet({ open, onClose, me, businessId, onSaved }: { open: boolean; onClose: () => void; me: PortalMe; businessId: string; onSaved: () => void }) {
  const api = useBrowserApi();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(me.profile.display_name ?? "");
  const [bio, setBio] = useState(me.card?.bio ?? me.profile.bio ?? "");
  const [languages, setLanguages] = useState<string[]>(me.card?.languages ?? ["en"]);
  const [avatar, setAvatar] = useState(me.card?.avatar_url ?? me.profile.avatar_url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const upload = async (file: File) => {
    setBusy(true);
    try {
      setAvatar(await api.businessProfile.uploadAvatar(await resizePhoto(file)));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await api.businessProfile.saveProfile({ businessId, displayName: name.trim(), bio: bio.trim() || null, languages, avatarUrl: avatar });
      onSaved();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit profile"
      footer={
        <button type="button" className={`${styles.dark} ${styles.full}`} onClick={save} disabled={busy || name.trim().length < 2}>
          {busy ? "Saving…" : "Save"}
        </button>
      }
    >
      <div className={styles.stack}>
        <div className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element -- profile photo */}
          {avatar ? <img src={api.media.url(avatar) ?? ""} alt="" className={styles.logo} /> : <span className={styles.logo} aria-hidden />}
          <button type="button" className={styles.outline} onClick={() => input.current?.click()} disabled={busy}>
            Change photo
          </button>
          <input ref={input} type="file" accept={ACCEPTED_PHOTOS} hidden aria-label="Profile photo" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
        </div>
        <label className={styles.field}>
          <span className={styles.label}>Name</span>
          <input className={styles.input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Bio</span>
          <textarea className={styles.textarea} value={bio} maxLength={500} onChange={(e) => setBio(e.target.value)} />
        </label>
        <div className={styles.field}>
          <span className={styles.label} id="lang-label">
            Languages
          </span>
          <ul className={styles.checkList} aria-labelledby="lang-label">
            {LISTING_LANGUAGES.map((l) => {
              const on = languages.includes(l.code);
              return (
                <li key={l.code}>
                  <button type="button" role="checkbox" aria-checked={on} className={styles.choice} onClick={() => setLanguages(on ? languages.filter((c) => c !== l.code) : [...languages, l.code])}>
                    {on ? "✓ " : ""}
                    {l.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <p className={styles.small}>Your name, photo, bio and languages also show on your host card in the app.</p>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </div>
    </Sheet>
  );
}

function VerifySheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (s: VerificationStatus) => void }) {
  const [files, setFiles] = useState<{ cnicFront?: File; cnicBack?: File; selfie?: File }>({});
  const [busy, setBusy] = useState(false);
  const ready = files.cnicFront && files.cnicBack && files.selfie;
  const tiles = [
    { key: "cnicFront", label: "CNIC front" },
    { key: "cnicBack", label: "CNIC back" },
    { key: "selfie", label: "Selfie holding your CNIC" },
  ] as const;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    const r = await submitIdentityVerification({ cnicFront: files.cnicFront!, cnicBack: files.cnicBack!, selfie: files.selfie! });
    setBusy(false);
    onDone(r.status);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Verify your identity"
      footer={
        <button type="button" className={`${styles.dark} ${styles.full}`} onClick={submit} disabled={!ready || busy}>
          {busy ? "Sending…" : "Submit"}
        </button>
      }
    >
      <div className={styles.stack}>
        <p className={styles.small}>Upload clear photos of both sides of your CNIC and a selfie holding it. Only the Moment team sees them.</p>
        <div className={styles.uploads}>
          {tiles.map((t) => (
            <label key={t.key} className={styles.uploadTile} data-done={files[t.key] ? "true" : undefined}>
              <PortalIcon name="image-add" />
              {files[t.key] ? `✓ ${t.label}` : t.label}
              <input type="file" accept="image/*" aria-label={t.label} capture={t.key === "selfie" ? "user" : undefined} hidden onChange={(e) => setFiles((f) => ({ ...f, [t.key]: e.target.files?.[0] }))} />
            </label>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function EmailSheet({ open, onClose, current, onDone }: { open: boolean; onClose: () => void; current: string | null; onDone: () => void }) {
  const api = useBrowserApi();
  const [email, setEmail] = useState(current ?? "");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const send = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await api.auth.changeEmail(email.trim());
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await api.auth.verifyEmailChange({ email: email.trim(), code: code.trim() });
      onDone();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Verify your email"
      footer={
        sent ? (
          <button type="button" className={`${styles.dark} ${styles.full}`} onClick={verify} disabled={busy || code.trim().length < 6}>
            {busy ? "Checking…" : "Verify"}
          </button>
        ) : (
          <button type="button" className={`${styles.dark} ${styles.full}`} onClick={send} disabled={busy || !/^\S+@\S+\.\S+$/.test(email.trim())}>
            {busy ? "Sending…" : "Send code"}
          </button>
        )
      }
    >
      <div className={styles.stack}>
        <label className={styles.field}>
          <span className={styles.label}>Email</span>
          <input className={styles.input} type="email" value={email} disabled={sent} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {sent ? (
          <label className={styles.field}>
            <span className={styles.label}>6-digit code</span>
            <input className={styles.input} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            <span className={styles.small}>We emailed a code to {email}. It can take a minute.</span>
          </label>
        ) : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </div>
    </Sheet>
  );
}
