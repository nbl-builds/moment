"use client";

import { businessForgotPasswordSchema } from "@moment/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/portal/button";
import { TextField } from "@/components/portal/fields";
import { businessRoutes, siteConfig } from "@/config/site";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import { savePendingVerification } from "@/lib/business/signup-state";
import form from "@/components/portal/form.module.css";
import styles from "../auth.module.css";

export function ForgotPasswordForm({ linkFailed }: { linkFailed: boolean }) {
  const api = useBrowserApi();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string>();
  const [formError, setFormError] = useState<string | undefined>(
    linkFailed ? "That reset link has expired or was already used. Ask for a new one." : undefined,
  );

  const parsed = businessForgotPasswordSchema.safeParse({ identifier });
  const fieldError = touched && identifier && !parsed.success ? parsed.error.issues[0]?.message : undefined;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!parsed.success) return;
    setSubmitting(true);
    setFormError(undefined);
    try {
      const id = parsed.data.identifier;
      if (id.kind === "email") {
        const origin = siteConfig.siteUrl ?? window.location.origin;
        const next = encodeURIComponent(businessRoutes.resetPassword);
        await api.auth.sendPasswordReset(id.email, `${origin}${businessRoutes.authCallback}?next=${next}`);
        setSentTo(id.email);
        setSubmitting(false);
      } else {
        await api.auth.sendPhoneOtp(id.phone, { createUser: false });
        savePendingVerification({ method: "phone", phone: id.phone, purpose: "recovery" });
        router.push(businessRoutes.verify);
      }
    } catch (error) {
      setFormError(errorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <form className={form.form} onSubmit={onSubmit} noValidate>
      <h1 className={form.title}>Forgot your password?</h1>
      <p className={`${form.subtitle} ${styles.forgotIntro}`}>
        Enter your email address or phone number and we’ll send you a reset link (email) or a code (phone).
      </p>

      <div className={styles.headingGap}>
        <TextField
          label="Email Address / Phone Number"
          name="identifier"
          autoComplete="username"
          placeholder="Enter phone/email here"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onBlur={() => setTouched(true)}
          error={fieldError}
          autoFocus
        />
      </div>

      <Button type="submit" className={styles.buttonGap} disabled={!parsed.success} loading={submitting}>
        Send link
      </Button>
      {sentTo ? (
        <p className={styles.successNote} role="status">
          If an account uses {sentTo}, a reset link is on its way. Open it on this device to choose a new password.
        </p>
      ) : null}
      {formError ? (
        <p className={form.formError} role="alert">
          {formError}
        </p>
      ) : null}

      <p className={styles.allSet}>
        All Set? <Link href={businessRoutes.login}>Login</Link>
      </p>
    </form>
  );
}
