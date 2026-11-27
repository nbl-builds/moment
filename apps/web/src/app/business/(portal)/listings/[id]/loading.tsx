import styles from "@/features/portal/listing-detail/listing-detail.module.css";

/** Skeleton while the listing loads. */
export default function Loading() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading listing">
      <div className={styles.skeletonLine} style={{ width: "18%" }} />
      <div className={styles.skeletonTitle} />
      <div className={styles.columns}>
        <div className={styles.left}>
          <div className={styles.skeletonCover} />
          <div className={styles.skeletonLine} style={{ width: "60%" }} />
          <div className={styles.skeletonLine} style={{ width: "40%" }} />
          <div className={styles.skeletonCard} />
        </div>
        <div className={styles.right}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </div>
    </div>
  );
}
