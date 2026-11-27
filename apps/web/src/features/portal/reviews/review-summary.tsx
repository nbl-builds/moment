import { Stars } from "./stars";
import styles from "./reviews.module.css";

/** Figma 130:1105: average (H2 61), stars, count and the 5..1 distribution bars. */
export function ReviewSummary({ average, total, distribution }: { average: number; total: number; distribution: { stars: number; count: number }[] }) {
  const max = Math.max(1, ...distribution.map((d) => d.count));
  return (
    <section className={styles.summary} aria-label="Rating summary">
      <div className={styles.average}>
        <p className={styles.big}>{total ? average.toFixed(1) : "–"}</p>
        <Stars value={average} size={20} />
        <p className={styles.count}>
          {total} {total === 1 ? "review" : "reviews"}
        </p>
      </div>
      <ul className={styles.bars}>
        {distribution.map((d) => (
          <li key={d.stars}>
            <span className={styles.barLabel}>{d.stars}</span>
            <span className={styles.track} aria-hidden>
              <span className={styles.fill} style={{ width: `${(d.count / max) * 100}%` }} />
            </span>
            <span className={styles.srOnly}>
              {d.count} {d.stars}-star reviews
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
