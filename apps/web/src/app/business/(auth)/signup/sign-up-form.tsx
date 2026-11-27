"use client";

import { COUNTRY_CALLING_CODE, emailSignInSchema, formatPkPhoneInput, phoneSignInSchema } from "@moment/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/portal/button";
import { TextField } from "@/components/portal/fields";
import { PortalIcon } from "@/components/portal/icon";
import { FACEBOOK, GOOGLE, SocialButtons } from "@/components/portal/social-buttons";
import { businessRoutes } from "@/config/site";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import { savePendingVerification } from "@/lib/business/signup-state";
import form from "@/components/portal/form.module.css";
import styles from "../auth.module.css";

export function SignUpForm({ method }: { method: "phone" | "email" }) {
  const api = useBrowserApi();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>();

  const parsed =
    method === "phone" ? phoneSignInSchema.safeParse({ phone: value }) : emailSignInSchema.safeParse({ email: value });
  const fieldError = touched && !parsed.success && value ? parsed.error.issues[0]?.message : undefined;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!parsed.success) return;
    setSubmitting(true);
    setFormError(undefined);
    try {
      if ("phone" in parsed.data) {
        await api.auth.sendPhoneOtp(parsed.data.phone);
        savePendingVerification({ method: "phone", phone: parsed.data.phone, purpose: "signup" });
      } else {
        await api.auth.sendEmailOtp(parsed.data.email);
        savePendingVerification({ method: "email", email: parsed.data.email, purpose: "signup" });
      }
      router.push(businessRoutes.verify);
    } catch (error) {
      setFormError(errorMessage(error));
      setSubmitting(false);
    }
  }

  const switchMethod =
    method === "phone"
      ? { key: "email", label: "Continue with email", icon: "mail" as const, href: `${businessRoutes.signup}?method=email` }
      : { key: "phone", label: "Continue with phone", icon: "mobile" as const, href: businessRoutes.signup };

  return (
    <form className={form.form} onSubmit={onSubmit} noValidate>
      <h1 className={form.title}>Sign Up</h1>
      <p className={form.subtitle}>
        Already have an account?{" "}
        <Link href={businessRoutes.login} className={`${form.inlineLink} ${form.underline}`}>
          Login
        </Link>
      </p>

      <div className={styles.headingGap}>
        {method === "phone" ? (
          <TextField
            label="Phone Number"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="3XX XXXXXXX"
            value={value}
            onChange={(e) => setValue(formatPkPhoneInput(e.target.value))}
            onBlur={() => setTouched(true)}
            error={fieldError}
            hint="We will call or text you to confirm your number. Standard message and rates apply."
            leading={
              <>
                <span className={form.prefix}>{COUNTRY_CALLING_CODE}</span>
                <span className={form.prefixIcon}>
                  <PortalIcon name="chevron-down" />
                </span>
              </>
            }
            autoFocus
          />
        ) : (
          <TextField
            label="Email Address"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@business.pk"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setTouched(true)}
            error={fieldError}
            hint="We will send the verification code on your email."
            autoFocus
          />
        )}
      </div>

      <Button type="submit" className={styles.buttonGap} disabled={!parsed.success} loading={submitting}>
        Continue
      </Button>
      {formError ? (
        <p className={form.formError} role="alert">
          {formError}
        </p>
      ) : null}

      <div className={`${form.divider} ${styles.sectionGap}`}>or</div>

      <div className={styles.sectionGap}>
        <SocialButtons
          gap={20}
          items={[
            GOOGLE,
            { key: switchMethod.key, label: switchMethod.label, icon: switchMethod.icon, onClick: () => router.push(switchMethod.href) },
            FACEBOOK,
          ]}
        />
      </div>

      <p className={`${form.legal} ${form.center} ${styles.smallGap}`}>
        By tapping continue with Email, Phone number, Apple, Facebook or Google, you agree to Moment{" "}
        <Link href={businessRoutes.terms}>Terms of Conditions</Link>
      </p>
    </form>
  );
}
