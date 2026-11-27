import type { Metadata } from "next";
import { AuthShell } from "@/components/portal/auth-shell";
import { ToastOnMount } from "@/components/portal/toast";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Login" };

const TOASTS: Record<string, string> = {
  "password-updated": "Password updated. Log in with your new password.",
  "signed-out": "You are signed out.",
};

/** Figma 472:4321. */
export default async function LoginPage({ searchParams }: PageProps<"/business/login">) {
  const { toast } = await searchParams;
  return (
    <AuthShell photo="login">
      <ToastOnMount message={typeof toast === "string" ? TOASTS[toast] : undefined} />
      <LoginForm />
    </AuthShell>
  );
}
