import styles from "./logo.module.css";

/**
 * Moment wordmark: the "M" mark and "oment" as two SVGs. White on the auth
 * photos (Figma 472:1651); Secondary on white (portal top bar, 209:947).
 */
export function Logo({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const suffix = tone === "dark" ? "logo-dark" : "logo-glyph";
  return (
    <span className={`${styles.logo} ${className ?? ""}`} role="img" aria-label="Moment">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimisation needed */}
      <img src={`/business/icons/${suffix}-b.svg`} alt="" width={28.34} height={24.97} className={styles.mark} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/business/icons/${suffix}-a.svg`} alt="" width={107.45} height={25.62} />
    </span>
  );
}
