import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/portal/auth-shell";
import { businessRoutes } from "@/config/site";
import { isSignUpType } from "@/lib/business/categories";
import { getOnboardingUser } from "@/lib/business/session";
import { DetailsForm } from "./details-form";

export const metadata: Metadata = { title: "Your details" };

/** Figma 472:4804 (empty), 472:3616 (filled), 626:4974 (email flow). */
export default async function OnboardingDetailsPage({ searchParams }: PageProps<"/business/onboarding/details">) {
  const [{ api, photo, isEmailFlow, email, phone, hasPassword }, { type, category }] = await Promise.all([
    getOnboardingUser(),
    searchParams,
  ]);
  if (!isSignUpType(type)) redirect(businessRoutes.onboardingType);
  const groups = await api.business.listSignUpCategories();
  const group = groups.find((g) => g.slug === category);
  if (!group) redirect(`${businessRoutes.onboardingCategory}?type=${type}`);

  return (
    <AuthShell photo={photo} align="top">
      <DetailsForm
        type={type}
        categoryId={group.id}
        lockedEmail={isEmailFlow ? email : undefined}
        phone={phone}
        askPassword={!hasPassword}
      />
    </AuthShell>
  );
}
