import type { Metadata } from "next";
import Link from "next/link";
import { PortalIcon, type PortalIconName } from "@/components/portal/icon";
import { getPortalContext } from "@/features/portal/context";
import styles from "@/features/account/account.module.css";

export const metadata: Metadata = { title: "Account settings" };

/** Avatar menu > Account Settings (Figma 131:676). Payment Method is for owners only. */
export default async function SettingsPage() {
  const ctx = await getPortalContext();
  const items: { href: string; icon: PortalIconName; title: string; text: string }[] = [
    { href: "/business/settings/personal", icon: "menu-user-42", title: "Personal Information", text: "Provide personal details and how we can reach you" },
    ...(ctx.permissions.withdraw
      ? [{ href: "/business/settings/payments", icon: "card-42" as const, title: "Payment Method", text: "Review your balance, payout accounts and payout history" }]
      : []),
    { href: "/business/settings/security", icon: "security-42", title: "Login & Security", text: "Update your password and secure your account" },
  ];
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Account Settings</h1>
      <div className={styles.cards}>
        {items.map((i) => (
          <Link key={i.href} href={i.href} className={styles.menuCard}>
            <span className={styles.menuIcon}>
              <PortalIcon name={i.icon} />
            </span>
            <span className={styles.rowMain}>
              <span className={styles.cardTitle}>{i.title}</span>
              <span className={styles.muted}>{i.text}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
