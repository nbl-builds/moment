"use client";

import { resetPasswordSchema } from "@moment/shared";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/portal/button";
import { PasswordField } from "@/components/portal/fields";
import { businessRoutes } from "@/config/site";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import form from "@/components/portal/form.module.css";
import styles from "../auth.module.css";

export function ResetPasswordForm() {
  const api = useBrowserApi();
  const router = useRouter();
  const [values, setValues] = useState({ password: "", confirmPassword: "" });
  const [touched, setTouched] = useState({ password: false, confirmPassword: false });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>();

  const parsed = resetPasswordSchema.safeParse(values);
  const errorFor = (key: "password" | "confirmPassword") =>
    touched[key] && values[key] && !parsed.success ? parsed.error.issues.find((i) => i.path[0] === key)?.message : undefined;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ password: true, confirmPassword: true });
    if (!parsed.success) return;
    setSubmitting(true);
    setFormError(undefined);
    try {
      await api.auth.updatePassword(parsed.data.password);
      await api.auth.signOut();
      router.replace(`${businessRoutes.login}?toast=password-updated`);
      router.refresh();
    } catch (error) {
      setFormError(errorMessage(error));
      setSubmitting(false);
    }
  }

  const bind = (key: "password" | "confirmPassword") => ({
    name: key,
    value: values[key],
    onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
    error: errorFor(key),
  });

  return (
    <form className={form.form} onSubmit={onSubmit} noValidate>
      <h1 className={form.title}>Set new password</h1>
      <div className={styles.resetGap}>
        <PasswordField label="New Password*" placeholder="Enter password" autoComplete="new-password" autoFocus {...bind("password")} />
        <div className={styles.smallGap}>
          <PasswordField label="Confirm New Password*" placeholder="Enter password" autoComplete="new-password" {...bind("confirmPassword")} />
        </div>
      </div>
      <Button type="submit" className={styles.sectionGap} disabled={!parsed.success} loading={submitting}>
        Save password
      </Button>
      {formError ? (
        <p className={form.formError} role="alert">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
