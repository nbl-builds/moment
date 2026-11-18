import styles from "./page.module.css";

// Placeholder. Consumer web, business portal (/business) and super admin (/admin)
// will live in separate route groups.
export default function Home() {
  return (
    <main className={styles.main}>
      <span className={styles.badge}>Moment</span>
      <h1 className={styles.title}>Discover Unforgettable Experiences</h1>
      <p className={styles.body}>Live like a local, anywhere in the world.</p>
    </main>
  );
}
