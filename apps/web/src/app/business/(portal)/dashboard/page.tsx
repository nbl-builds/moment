import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/portal/logo";
import { businessRoutes } from "@/config/site";
import { createServerApi } from "@/lib/api/server";
import { SignOutButton } from "./sign-out-button";
import styles from "./dashboard.module.css";

export const metadata: Metadata = { title: "Dashboard" };

const KIND_LABELS = { host: "Host", operator: "Experience operator", venue: "Venue" } as const;

/** Placeholder until the portal dashboard is designed: business name, status and sign out. */
export default async function DashboardPage() {
  const api = await createServerApi();
  const memberships = await api.business.listMyBusinesses();
  const membership = memberships[0];
  if (!membership) redirect(businessRoutes.onboardingType);
  const { business } = membership;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Logo tone="dark" />
        <SignOutButton />
      </header>
      <main className={styles.main}>
        {business.status === "pending_review" ? (
          <div className={styles.banner} role="status">
            <strong>Your business is under review.</strong> Moment checks every new business before it goes live.
            We’ll let you know as soon as it’s approved; meanwhile you can look around.
          </div>
        ) : null}
        <p className={styles.eyebrow}>
          {KIND_LABELS[business.kind]} · {membership.role === "owner" ? "Owner" : membership.role}
        </p>
        <h1 className={styles.title}>{business.name}</h1>
        <p className={styles.body}>
          {business.status === "active"
            ? "Your business is live on Moment. Listings, availability, bookings and reviews arrive here next."
            : "Listings, availability, bookings and reviews arrive here next."}
        </p>
      </main>
    </div>
  );
}
