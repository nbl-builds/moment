import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { businessRoutes, siteConfig } from "@/config/site";
import { Logo } from "./logo";
import styles from "./auth-shell.module.css";

/** Photos from the Figma frames: phone flow (cave), email flow, login, forgot / reset password. */
export type AuthPhoto = "welcome" | "email" | "login" | "forgot" | "reset";

/**
 * Split-screen auth layout (Figma 1440 x 1024): photo on the left (710 wide)
 * with the white Moment logo, form on the right with "Contact Us". Below
 * 1024px the photo is hidden and the form is centred.
 */
export function AuthShell({
  photo,
  children,
  align = "center",
}: {
  photo: AuthPhoto;
  children: ReactNode;
  /** "top" for long forms that scroll (details form). */
  align?: "center" | "top";
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.photo}>
        <div className={styles.photoFrame}>
          <Image src={`/business/auth/${photo}.webp`} alt="" fill preload sizes="(min-width: 1024px) 50vw, 1px" className={styles.photoImage} />
        </div>
        <Link href={businessRoutes.welcome} className={styles.photoLogo} aria-label="Moment business home">
          <Logo />
        </Link>
      </aside>
      <div className={styles.side}>
        <header className={styles.header}>
          <Link href={businessRoutes.welcome} className={styles.headerLogo} aria-label="Moment business home">
            <Logo tone="dark" />
          </Link>
          <a href={`mailto:${siteConfig.contactEmail}`} className={styles.contact}>
            Contact Us
          </a>
        </header>
        <main className={`${styles.main} ${align === "top" ? styles.top : ""}`}>{children}</main>
      </div>
    </div>
  );
}
