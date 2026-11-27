"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { businessRoutes } from "@/config/site";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import styles from "./dashboard.module.css";

export function SignOutButton() {
  const api = useBrowserApi();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={styles.signOut}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await api.auth.signOut().catch(() => undefined);
        router.replace(`${businessRoutes.login}?toast=signed-out`);
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
