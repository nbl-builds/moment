"use client";

import { useState } from "react";
import { PortalIcon } from "@/components/portal/icon";
import { HelpSheet, WhatsNewSheet } from "../shell/help-sheet";
import styles from "./dashboard.module.css";

/** Contact Support / What's New cards (Figma 209:955, 209:956) and their sheets. */
export function SideCards({ layout = "row" }: { layout?: "row" | "tile" }) {
  const [open, setOpen] = useState<"help" | "news" | null>(null);
  const cardClass = layout === "tile" ? styles.tileCard : styles.sideCard;
  return (
    <>
      <button type="button" className={cardClass} onClick={() => setOpen("help")}>
        <span className={styles.sideIcon}>
          <PortalIcon name="headphones" size={layout === "tile" ? 38 : 31} />
        </span>
        <span className={styles.sideText}>
          <span className={layout === "tile" ? styles.tileTitle : styles.sideTitle}>Contact Support</span>
          <span className={styles.sideSub}>Contact moment support 24/7.</span>
        </span>
        {layout === "row" ? (
          <span className={styles.sideChevron} aria-hidden>
            <PortalIcon name="direction-right" />
          </span>
        ) : null}
      </button>
      <button type="button" className={cardClass} onClick={() => setOpen("news")}>
        <span className={styles.sideIcon}>
          <PortalIcon name="m-mark" size={layout === "tile" ? 42 : 28} />
        </span>
        <span className={styles.sideText}>
          <span className={layout === "tile" ? styles.tileTitle : styles.sideTitle}>What’s New!</span>
          <span className={styles.sideSub}>See what is new coming on moment!</span>
        </span>
        {layout === "row" ? (
          <span className={styles.sideChevron} aria-hidden>
            <PortalIcon name="direction-right" />
          </span>
        ) : null}
      </button>
      <HelpSheet open={open === "help"} onClose={() => setOpen(null)} />
      <WhatsNewSheet open={open === "news"} onClose={() => setOpen(null)} />
    </>
  );
}
