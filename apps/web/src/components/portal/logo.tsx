import styles from "./logo.module.css";

/**
 * Moment wordmark (Figma 472:1651): the "M" mark and "oment" exported as two
 * white SVGs. `tone="dark"` turns it near black for white backgrounds (the
 * auth pages below 1024px, where the photo is hidden).
 */
export function Logo({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <span className={`${styles.logo} ${tone === "dark" ? styles.dark : ""} ${className ?? ""}`} role="img" aria-label="Moment">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimisation needed */}
      <img src="/business/icons/logo-glyph-b.svg" alt="" width={28.34} height={24.97} className={styles.mark} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/business/icons/logo-glyph-a.svg" alt="" width={107.45} height={25.62} />
    </span>
  );
}
