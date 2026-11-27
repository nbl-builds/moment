import Link from "next/link";
import styles from "./portal.module.css";

/** Routes that belong to later sections (Notifications, Profile, Settings, listing wizard). */
export function PortalPlaceholder({ title, body, back = { href: "/business/dashboard", label: "Back to dashboard" } }: { title: string; body: string; back?: { href: string; label: string } }) {
  return (
    <div className={`${styles.cardLarge} ${styles.placeholder}`}>
      <h1 className={styles.title}>{title}</h1>
      <p>{body}</p>
      <Link href={back.href} className={styles.outlineButton}>
        {back.label}
      </Link>
    </div>
  );
}
