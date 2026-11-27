import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/portal/auth-shell";
import { PortalIcon } from "@/components/portal/icon";
import { businessRoutes } from "@/config/site";
import { CATEGORY_ICONS, isSignUpType } from "@/lib/business/categories";
import { getOnboardingUser } from "@/lib/business/session";
import form from "@/components/portal/form.module.css";
import styles from "../onboarding.module.css";

export const metadata: Metadata = { title: "What do you provide?" };

/** Figma 472:1727 / 626:4885: single select from the category groups. */
export default async function OnboardingCategoryPage({ searchParams }: PageProps<"/business/onboarding/category">) {
  const [{ api, photo }, { type, category: chosen }] = await Promise.all([getOnboardingUser(), searchParams]);
  if (!isSignUpType(type)) redirect(businessRoutes.onboardingType);
  const categories = await api.business.listSignUpCategories();

  return (
    <AuthShell photo={photo} align="top">
      <div className={`${form.form} ${styles.grid}`}>
        <h1 className={form.title}>What does your business provide? Select one.</h1>
        <ul className={styles.tiles}>
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`${businessRoutes.onboardingDetails}?type=${type}&category=${c.slug}`}
                className={styles.tile}
                data-selected={chosen === c.slug ? "true" : undefined}
              >
                <span className={styles.tileIcon}>{CATEGORY_ICONS[c.slug] ? <PortalIcon name={CATEGORY_ICONS[c.slug]!} /> : null}</span>
                <span className={styles.tileTitle}>{c.name}</span>
                <span className={styles.tileDescription}>{c.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AuthShell>
  );
}
