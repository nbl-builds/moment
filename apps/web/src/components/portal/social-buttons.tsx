"use client";

import { PortalIcon, type PortalIconName } from "./icon";
import { useToast } from "./toast";
import styles from "./form.module.css";

type Social = { key: string; label: string; icon: PortalIconName; onClick?: () => void };

/** Google and Facebook sign-in come later (no social providers yet). */
export const GOOGLE: Social = { key: "google", label: "Continue with google", icon: "google" };
export const FACEBOOK: Social = { key: "facebook", label: "Continue with facebook", icon: "facebook" };
const PROVIDER_NAMES: Record<string, string> = { google: "Google", facebook: "Facebook" };

/** "Continue with google / email / facebook" (Figma 472:2024..2031). Google and Facebook are not live yet. */
export function SocialButtons({ items, gap }: { items: Social[]; gap: number }) {
  const toast = useToast();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={styles.social}
          onClick={item.onClick ?? (() => toast(`${PROVIDER_NAMES[item.key] ?? item.label} sign-in is coming soon`))}
        >
          <span className={styles.socialIcon}>
            <PortalIcon name={item.icon} />
          </span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
