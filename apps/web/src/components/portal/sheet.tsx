"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./sheet.module.css";

/**
 * Right-side panel over a scrim (reservation panel, help, what's new). Esc and
 * the scrim close it; focus moves into the panel and back when it closes.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={styles.root}>
      <div className={styles.scrim} onClick={onClose} aria-hidden />
      <div ref={panel} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? "sheet-title"} tabIndex={-1}>
        <header className={styles.header}>
          <h2 id={labelledBy ?? "sheet-title"} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </div>
  );
}
