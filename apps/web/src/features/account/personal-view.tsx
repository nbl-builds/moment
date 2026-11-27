"use client";

import { COUNTRIES, normalizePkPhone, PK_CITIES, type PortalMe } from "@moment/shared";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useToast } from "@/components/portal/toast";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import styles from "./account.module.css";

/** "h***d@gmail.com", as in Figma 515:3218. */
export function maskEmail(email: string) {
  const [user = "", domain = ""] = email.split("@");
  if (user.length <= 2) return `${user[0] ?? ""}***@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

/** "+92*******2001". */
export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `+${digits.slice(0, 2)}${"*".repeat(Math.max(0, digits.length - 6))}${digits.slice(-4)}`;
}

type Key = "name" | "email" | "phone" | "country" | "city";

/** Figma 515:3218: rows with an inline Edit each. */
export function PersonalView({ me }: { me: PortalMe }) {
  const api = useBrowserApi();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<Key | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [name, setName] = useState(me.profile.display_name ?? "");
  const [city, setCity] = useState(me.profile.home_city ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const close = () => {
    setOpen(null);
    setError(undefined);
    setCode("");
    setCodeSent(false);
  };
  const run = async (work: () => Promise<unknown>, done: string, closeAfter = true) => {
    setBusy(true);
    setError(undefined);
    try {
      await work();
      if (done) toast(done);
      if (closeAfter) {
        close();
        router.refresh();
      }
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const phoneE164 = normalizePkPhone(phone);

  const rows: { key: Key; label: string; value: string; form: ReactNode }[] = [
    {
      key: "name",
      label: "Full Name",
      value: me.profile.display_name ?? "Not set",
      form: (
        <>
          <input className={styles.input} aria-label="Full name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          <Actions busy={busy} disabled={name.trim().length < 2} onCancel={close} onSave={() => run(() => api.businessProfile.savePersonal({ displayName: name.trim() }), "Name saved.")} />
        </>
      ),
    },
    {
      key: "email",
      label: "Email address",
      value: me.email ? maskEmail(me.email) : "Not added",
      form: (
        <>
          <input className={styles.input} type="email" aria-label="New email" placeholder="you@example.com" value={email} disabled={codeSent} onChange={(e) => setEmail(e.target.value)} />
          {codeSent ? (
            <>
              <input className={styles.input} aria-label="Email code" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
              <p className={styles.small}>We emailed a code to {email}.</p>
              <Actions busy={busy} disabled={code.length < 6} label="Verify" onCancel={close} onSave={() => run(() => api.auth.verifyEmailChange({ email: email.trim(), code }), "Email updated.")} />
            </>
          ) : (
            <Actions
              busy={busy}
              disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}
              label="Send code"
              onCancel={close}
              onSave={async () => {
                if (await run(() => api.auth.changeEmail(email.trim()), "", false)) setCodeSent(true);
              }}
            />
          )}
        </>
      ),
    },
    {
      key: "phone",
      label: "Phone number",
      value: me.phone ? maskPhone(me.phone) : "Not added",
      form: (
        <>
          <div className={styles.input} style={{ display: "flex", alignItems: "center", gap: "var(--web-space-8)" }}>
            <span className={styles.small}>+92</span>
            <input
              aria-label="New phone number"
              className={styles.full}
              style={{ border: 0, background: "transparent", font: "inherit", outline: "none" }}
              inputMode="tel"
              placeholder="300 1234567"
              value={phone}
              disabled={codeSent}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {codeSent ? (
            <>
              <input className={styles.input} aria-label="SMS code" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
              <Actions busy={busy} disabled={code.length < 6} label="Verify" onCancel={close} onSave={() => run(() => api.auth.verifyPhoneChange({ phone: phoneE164!, code }), "Phone number updated.")} />
            </>
          ) : (
            <Actions
              busy={busy}
              disabled={!phoneE164}
              label="Send code"
              onCancel={close}
              onSave={async () => {
                if (await run(() => api.auth.changePhone(phoneE164!), "", false)) setCodeSent(true);
              }}
            />
          )}
        </>
      ),
    },
    {
      key: "country",
      label: "Country",
      value: "Pakistan",
      form: (
        <>
          <select className={styles.select} aria-label="Country" value="PK" onChange={() => {}}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <p className={styles.small}>Moment is in Pakistan only for now.</p>
          <Actions busy={false} onCancel={close} onSave={close} label="Done" />
        </>
      ),
    },
    {
      key: "city",
      label: "City",
      value: me.profile.home_city ?? "Not set",
      form: (
        <>
          <select className={styles.select} aria-label="City" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="" disabled>
              Select city
            </option>
            {PK_CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <Actions busy={busy} disabled={!city} onCancel={close} onSave={() => run(() => api.businessProfile.savePersonal({ homeCity: city }), "City saved.")} />
        </>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Personal Information</h1>
      <div className={styles.cards}>
        <div className={styles.panelCard}>
          <ul className={styles.rows}>
            {rows.map((r) => (
              <li key={r.key} className={styles.row}>
                <div className={styles.rowMain}>
                  <span className={styles.cardTitle}>{r.label}</span>
                  {open === r.key ? (
                    <div className={styles.editForm}>
                      {r.form}
                      {error ? (
                        <p className={styles.error} role="alert">
                          {error}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <span className={styles.muted}>{r.value}</span>
                  )}
                </div>
                {open === r.key ? null : (
                  <button
                    type="button"
                    className={styles.outline}
                    aria-label={`Edit ${r.label.toLowerCase()}`}
                    onClick={() => {
                      close();
                      setOpen(r.key);
                    }}
                  >
                    Edit
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Actions({ busy, disabled, onCancel, onSave, label = "Save" }: { busy: boolean; disabled?: boolean; onCancel: () => void; onSave: () => void; label?: string }) {
  return (
    <div className={styles.formRow}>
      <button type="button" className={styles.dark} onClick={onSave} disabled={busy || disabled}>
        {busy ? "Saving…" : label}
      </button>
      <button type="button" className={styles.outline} onClick={onCancel} disabled={busy}>
        Cancel
      </button>
    </div>
  );
}
