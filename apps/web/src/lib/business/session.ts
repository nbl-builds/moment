import "server-only";
import { redirect } from "next/navigation";
import { businessRoutes } from "@/config/site";
import { createServerApi } from "@/lib/api/server";
import type { AuthPhoto } from "@/components/portal/auth-shell";

/**
 * The signed-in portal user for onboarding pages (the proxy has already sent
 * signed-out visitors to login). Email sign-ups see the email-flow photo and
 * get their email prefilled and locked on the details form.
 */
export async function getOnboardingUser() {
  const api = await createServerApi();
  const user = await api.auth.getUser();
  if (!user) redirect(businessRoutes.login);

  const { data } = await api.db.auth.getClaims();
  const amr = (data?.claims.amr ?? []) as { method?: string }[];

  const isEmailFlow = Boolean(user.email) && !user.phone;
  const photo: AuthPhoto = isEmailFlow ? "email" : "welcome";
  return {
    api,
    user,
    isEmailFlow,
    photo,
    /** Signed in with a password this session, so the account already has one. */
    hasPassword: amr.some((a) => a.method === "password"),
    email: user.email ?? undefined,
    phone: user.phone ? `+${user.phone.replace(/^\+/, "")}` : undefined,
  };
}
