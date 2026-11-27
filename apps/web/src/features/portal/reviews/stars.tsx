/* eslint-disable @next/next/no-img-element -- static Figma star */
import styles from "./reviews.module.css";

/** Five 14px stars (Figma 131:551); partial stars are greyed. */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className={styles.stars} role="img" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <img key={n} src="/business/icons/star-14.svg" alt="" width={size} height={size} data-empty={value < n - 0.25 ? "true" : undefined} />
      ))}
    </span>
  );
}
