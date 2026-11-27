import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/portal/auth-shell";
import { PortalIcon } from "@/components/portal/icon";
import { businessRoutes } from "@/config/site";
import { getOnboardingUser } from "@/lib/business/session";
import form from "@/components/portal/form.module.css";
import authStyles from "../../auth.module.css";
import styles from "../onboarding.module.css";

export const metadata: Metadata = { title: "Tell us about yourself" };

const TYPES = [
  {
    type: "host",
    title: "Host & Experiences",
    description: "You host it yourself: guided walks, food trails, workshops and adventures.",
    icon: "icon-user",
  },
  {
    type: "business",
    title: "Business",
    description: "A company or venue: tour operators, restaurants, spas, salons and studios.",
    icon: "icon-briefcase",
  },
] as const;

/** Figma 472:1880 / 626:4832. Host -> businesses.kind 'host'; Business -> operator or venue by category. */
export default async function OnboardingTypePage({ searchParams }: PageProps<"/business/onboarding/type">) {
  const [{ photo }, { type: chosen }] = await Promise.all([getOnboardingUser(), searchParams]);
  return (
    <AuthShell photo={photo}>
      <div className={`${form.form} ${styles.wide}`}>
        <h1 className={form.title}>Tell us about yourself</h1>
        <p className={`${form.subtitle} ${authStyles.intro}`}>
          Each experience is vetted for quality by a team of editors before it makes its way onto the platform.
        </p>
        <ul className={styles.typeList}>
          {TYPES.map((t) => (
            <li key={t.type}>
              <Link
                href={`${businessRoutes.onboardingCategory}?type=${t.type}`}
                className={styles.typeCard}
                data-selected={chosen === t.type ? "true" : undefined}
              >
                <span className={styles.typeIcon}>
                  <PortalIcon name={t.icon} />
                </span>
                <span className={styles.typeText}>
                  <span className={styles.typeTitle}>{t.title}</span>
                  <span className={styles.typeDescription}>{t.description}</span>
                </span>
                <span className={styles.chevron}>
                  <PortalIcon name="direction-right" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AuthShell>
  );
}
