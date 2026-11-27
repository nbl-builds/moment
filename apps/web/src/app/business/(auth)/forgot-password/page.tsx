import type { Metadata } from "next";
import { AuthShell } from "@/components/portal/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

/** Figma 472:5023. Email -> reset link; phone -> code, then Set new password. */
export default async function ForgotPasswordPage({ searchParams }: PageProps<"/business/forgot-password">) {
  const { error } = await searchParams;
  return (
    <AuthShell photo="forgot">
      <ForgotPasswordForm linkFailed={error === "link"} />
    </AuthShell>
  );
}
