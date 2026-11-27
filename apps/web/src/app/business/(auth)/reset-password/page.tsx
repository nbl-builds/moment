import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/portal/auth-shell";
import { businessRoutes } from "@/config/site";
import { createServerApi } from "@/lib/api/server";
import form from "@/components/portal/form.module.css";
import styles from "../auth.module.css";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Set new password" };

/**
 * Figma 472:5102. Reached from the email reset link (via /business/auth/callback)
 * or after the phone code, both of which leave a signed-in recovery session.
 */
export default async function ResetPasswordPage() {
  const api = await createServerApi();
  const user = await api.auth.getUser();

  return (
    <AuthShell photo="reset">
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className={form.form}>
          <h1 className={form.title}>Set new password</h1>
          <p className={form.subtitle}>
            This page opens from the reset link or code we send you. Ask for a new one to continue.
          </p>
          <p className={styles.allSet}>
            <Link href={businessRoutes.forgotPassword}>Forgot password</Link>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
