"use client";

import { formatDate, formatTime, passwordSchema, type PortalMe } from "@moment/shared";
import { useEffect, useState } from "react";
import { PasswordField } from "@/components/portal/fields";
import { PortalIcon } from "@/components/portal/icon";
import { useToast } from "@/components/portal/toast";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import { otherDevices, type DeviceSession } from "./mock";
import styles from "./account.module.css";

function describeBrowser(ua: string) {
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : "your device";
  return `${browser} on ${os}`;
}

/** Figma 515:3295 (Login & Security). */
export function SecurityView({ me, timeZone }: { me: PortalMe; timeZone: string }) {
  const api = useBrowserApi();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [changedAt, setChangedAt] = useState(me.passwordChangedAt);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [thisDevice, setThisDevice] = useState("This browser");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    void otherDevices().then(setDevices);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the user agent is only known in the browser
    setThisDevice(describeBrowser(navigator.userAgent));
  }, []);

  const rule = passwordSchema.safeParse(next);
  const ruleError = next && !rule.success ? rule.error.issues[0]?.message : undefined;
  const mismatch = confirm && confirm !== next ? "Passwords don’t match" : undefined;
  const login = me.email ? { email: me.email } : me.phone ? { phone: me.phone } : null;

  const save = async () => {
    if (!login) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.auth.changePassword({ login, current, next });
      setChangedAt(new Date().toISOString());
      setOpen(false);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast("Password updated.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const logOutOthers = async () => {
    setSigningOut(true);
    try {
      await api.auth.signOutOthers();
      setDevices([]);
      toast("Logged out of your other devices.");
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Login &amp; Security</h1>
      <div className={styles.cards}>
        <div className={styles.panelCard}>
          <div className={styles.row} data-last-plain="true">
            <div className={styles.rowMain}>
              <span className={styles.cardTitle}>Password</span>
              <span className={styles.muted}>
                {changedAt ? `Last updated ${formatDate(changedAt, { timeZone, style: "medium" })}` : `Set when you joined (${formatDate(me.createdAt, { timeZone, style: "medium" })})`}
              </span>
              {open ? (
                <div className={styles.editForm}>
                  <PasswordField label="Current password" name="current" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
                  <PasswordField label="New password" name="new" autoComplete="new-password" value={next} error={ruleError} hint="At least 8 characters with a letter and a number." onChange={(e) => setNext(e.target.value)} />
                  <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" value={confirm} error={mismatch} onChange={(e) => setConfirm(e.target.value)} />
                  {error ? (
                    <p className={styles.error} role="alert">
                      {error}
                    </p>
                  ) : null}
                  <div className={styles.formRow}>
                    <button type="button" className={styles.dark} onClick={save} disabled={busy || !current || !rule.success || confirm !== next || !login}>
                      {busy ? "Saving…" : "Save password"}
                    </button>
                    <button type="button" className={styles.outline} onClick={() => setOpen(false)} disabled={busy}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            {open ? null : (
              <button type="button" className={styles.outline} onClick={() => setOpen(true)}>
                Update Password
              </button>
            )}
          </div>
        </div>

        <div className={styles.panelCard}>
          <h2 className={styles.panelHeading}>Social Accounts</h2>
          <ul className={styles.rows}>
            {["Facebook", "Google"].map((p, i, all) => (
              <li key={p} className={styles.row} data-last-plain={i === all.length - 1 ? "true" : undefined} style={{ minHeight: 0 }}>
                <div className={styles.rowMain}>
                  <span className={styles.cardTitle}>{p}</span>
                  <span className={styles.muted}>Not connected</span>
                </div>
                <button type="button" className={styles.outline} disabled title="Coming soon">
                  Coming soon
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.panelCard}>
          <h2 className={styles.panelHeading}>Device history</h2>
          <ul className={styles.rows}>
            <li className={styles.row} style={{ minHeight: 0 }}>
              <span className={styles.deviceIcon}>
                <PortalIcon name="device-mobile-50" />
              </span>
              <div className={styles.rowMain}>
                <span className={styles.cardTitle}>{thisDevice}</span>
                <span className={styles.muted}>
                  This device · signed in {me.lastSignInAt ? `${formatDate(me.lastSignInAt, { timeZone, style: "medium" })} at ${formatTime(me.lastSignInAt, timeZone)}` : "now"}
                </span>
              </div>
              <span className={styles.small}>Current session</span>
            </li>
            {devices.map((d, i) => (
              <li key={d.id} className={styles.row} data-last-plain={i === devices.length - 1 ? "true" : undefined} style={{ minHeight: 0 }}>
                <span className={styles.deviceIcon}>
                  <PortalIcon name="device-mobile-50" />
                </span>
                <div className={styles.rowMain}>
                  <span className={styles.cardTitle}>{d.label}</span>
                  <span className={styles.muted}>
                    {d.place} · {formatDate(d.lastActive, { timeZone, style: "medium" })} at {formatTime(d.lastActive, timeZone)}
                  </span>
                </div>
                <button type="button" className={styles.ghost} onClick={logOutOthers} disabled={signingOut}>
                  Log out device
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.formRow} style={{ paddingTop: "var(--web-space-20)" }}>
            <button type="button" className={styles.outline} onClick={logOutOthers} disabled={signingOut}>
              {signingOut ? "Logging out…" : "Log out of other devices"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
