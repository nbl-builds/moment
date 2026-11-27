"use client";

import { OTP_LENGTH } from "@moment/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuthShell } from "@/components/portal/auth-shell";
import { PortalIcon } from "@/components/portal/icon";
import { OtpInput } from "@/components/portal/otp-input";
import { useToast } from "@/components/portal/toast";
import { businessRoutes } from "@/config/site";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import { clearPendingVerification, markResent, readPendingVerification } from "@/lib/business/signup-state";
import form from "@/components/portal/form.module.css";
import authStyles from "../auth.module.css";
import styles from "./verify.module.css";

/** Seconds before "Send again" works (matches the hosted email limit, 60 s). */
const RESEND_COOLDOWN = 60;

export function VerifyCode() {
  const api = useBrowserApi();
  const router = useRouter();
  const toast = useToast();
  // sessionStorage is only there in the browser: read it after hydration
  // (undefined = not read yet, null = nothing pending).
  const [pending, setPending] = useState<ReturnType<typeof readPendingVerification> | undefined>(undefined);
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [message, setMessage] = useState<string>();
  const [verifying, setVerifying] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [sentAt, setSentAt] = useState<number>();

  useEffect(() => {
    const stored = readPendingVerification();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of sessionStorage after hydration
    setPending(stored);
    if (!stored) router.replace(businessRoutes.signup);
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lastSent = sentAt ?? pending?.sentAt ?? 0;
  const secondsLeft = Math.max(0, RESEND_COOLDOWN - Math.floor((now - lastSent) / 1000));

  const verify = useCallback(
    async (value: string) => {
      if (!pending || verifying) return;
      setVerifying(true);
      setMessage(undefined);
      try {
        if (pending.method === "phone") await api.auth.verifyPhoneOtp({ phone: pending.phone, code: value });
        else await api.auth.verifyEmailOtp({ email: pending.email, code: value });
        clearPendingVerification();
        // The proxy sends people who already have a business on to the dashboard.
        router.replace(pending.purpose === "recovery" ? businessRoutes.resetPassword : businessRoutes.onboardingType);
        router.refresh();
      } catch (error) {
        setInvalid(true);
        setMessage(errorMessage(error, "That code is not right. Check it and try again."));
        setVerifying(false);
      }
    },
    [api, pending, router, verifying],
  );

  async function resend() {
    if (!pending || secondsLeft > 0) return;
    try {
      if (pending.method === "phone") await api.auth.sendPhoneOtp(pending.phone, { createUser: pending.purpose === "signup" });
      else await api.auth.sendEmailOtp(pending.email);
      markResent();
      setSentAt(Date.now());
      setCode("");
      setInvalid(false);
      setMessage(undefined);
      toast("We sent you a new code");
    } catch (error) {
      toast(errorMessage(error));
    }
  }

  const photo = pending?.purpose === "recovery" ? "forgot" : pending?.method === "email" ? "email" : "welcome";
  const destination = pending ? (pending.method === "phone" ? pending.phone : pending.email) : "";

  return (
    <AuthShell photo={photo}>
      <div className={form.form}>
        <div className={styles.badge}>
          <PortalIcon name="padlock" />
        </div>
        <h1 className={`${form.title} ${styles.title}`}>Enter Verification Code</h1>
        <p className={`${form.subtitle} ${styles.sentTo}`}>
          <span>Sent to {destination}</span>
          <span className={styles.dot} aria-hidden>
            •
          </span>
          <button type="button" className={form.linkButton} onClick={() => router.back()}>
            Edit
          </button>
        </p>

        <div className={styles.code}>
          <OtpInput
            value={code}
            onChange={(v) => {
              setCode(v);
              if (invalid) {
                setInvalid(false);
                setMessage(undefined);
              }
            }}
            onComplete={verify}
            invalid={invalid}
            disabled={verifying || !pending}
            autoFocus
          />
          <p className={styles.message} role="alert">
            {message ?? (verifying ? "Checking your code…" : "")}
          </p>
          <p className={form.srOnly}>Enter the {OTP_LENGTH}-digit code. It is checked as soon as all digits are in.</p>
        </div>

        <p className={authStyles.resend}>
          Didn’t get a code?{" "}
          <button type="button" className={form.linkButton} onClick={resend} disabled={secondsLeft > 0}>
            {secondsLeft > 0 ? `Send again in 0:${String(secondsLeft).padStart(2, "0")}` : "Send again"}
          </button>
        </p>
      </div>
    </AuthShell>
  );
}
