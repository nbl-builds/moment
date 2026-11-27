"use client";

import { businessLoginSchema } from "@moment/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/portal/button";
import { PasswordField, TextField } from "@/components/portal/fields";
import { FACEBOOK, GOOGLE, SocialButtons } from "@/components/portal/social-buttons";
import { businessRoutes } from "@/config/site";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import form from "@/components/portal/form.module.css";
import styles from "../auth.module.css";

export function LoginForm() {
  const api = useBrowserApi();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>();

  const parsed = businessLoginSchema.safeParse({ identifier, password });
  const identifierError =
    touched && identifier && !parsed.success
      ? parsed.error.issues.find((i) => i.path[0] === "identifier")?.message
      : undefined;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!parsed.success) return;
    setSubmitting(true);
    setFormError(undefined);
    try {
      const id = parsed.data.identifier;
      if (id.kind === "email") await api.auth.signInWithPassword({ email: id.email, password });
      else await api.auth.signInWithPhonePassword({ phone: id.phone, password });
      // The proxy sends accounts without a business to onboarding.
      router.replace(businessRoutes.dashboard);
      router.refresh();
    } catch (error) {
      setFormError(errorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <form className={form.form} onSubmit={onSubmit} noValidate>
      <h1 className={form.title}>Login</h1>
      <p className={form.subtitle}>
        Don’t have an account?{" "}
        <Link href={businessRoutes.signup} className={form.inlineLink}>
          Sign up
        </Link>
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
          error={identifierError}
          autoFocus
        />
        <div className={styles.smallGap}>
          <PasswordField
            label="Password*"
            name="password"
            autoComplete="current-password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <div className={styles.forgotRow}>
        <Link href={businessRoutes.forgotPassword}>Forgot password?</Link>
      </div>

      <Button type="submit" disabled={!parsed.success} loading={submitting}>
        Continue to my account
      </Button>
      {formError ? (
        <p className={form.formError} role="alert">
          {formError}
        </p>
      ) : null}

      <div className={`${form.divider} ${styles.sectionGap}`}>or</div>
      <div className={styles.sectionGap}>
        <SocialButtons gap={24} items={[GOOGLE, FACEBOOK]} />
      </div>
    </form>
  );
}
