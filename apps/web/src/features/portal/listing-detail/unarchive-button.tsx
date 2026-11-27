"use client";

import { useListingActions } from "./actions";
import styles from "./listing-detail.module.css";

export function UnarchiveButton({ listingId }: { listingId: string }) {
  const { setStatus, busy } = useListingActions(listingId);
  return (
    <button type="button" className={styles.pillButton} disabled={busy} onClick={() => void setStatus("draft", "Unarchived. It's a draft again, publish it when you're ready.")}>
      Unarchive
    </button>
  );
}
