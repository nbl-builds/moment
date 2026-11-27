import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/portal/auth-shell";
import { businessRoutes } from "@/config/site";
import form from "@/components/portal/form.module.css";
import styles from "./auth.module.css";

export const metadata: Metadata = { title: "Welcome" };

/** Figma 472:1633 "A new journey starts here". */
export default function BusinessWelcomePage() {
  return (
    <AuthShell photo="welcome">
      <div className={form.form}>
        <h1 className={form.title}>A new journey starts here</h1>
        <p className={`${form.subtitle} ${styles.intro}`}>
          Each experience is vetted for quality by a team of editors before it makes its way onto the platform.
        </p>
        <Link href={businessRoutes.signup} className={`${form.button} ${form.ctaButton} ${styles.getStarted}`}>
          Get Started
        </Link>
      </div>
    </AuthShell>
  );
}
