"use client";

import type { PortalListingDetail } from "@moment/shared";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/portal/confirm-dialog";
import { useListingActions } from "./actions";
import { editHref, statusLabel } from "./links";
import styles from "./listing-detail.module.css";

/** Breadcrumb, "Listing Details" (Figma x80 / y172), status pill, Preview, Edit listing and the ••• menu. */
export function ListingHeader({ listing, businessStatus, canEdit }: { listing: PortalListingDetail; businessStatus: string; canEdit: boolean }) {
  const actions = useListingActions(listing.id);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = statusLabel(listing.status, businessStatus);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  return (
    <header className={styles.header}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/business/listings">Listings</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{listing.title}</span>
      </nav>
      <div className={styles.titleRow}>
        <h1 className={styles.pageTitle}>Listing Details</h1>
        <div className={styles.headerActions}>
          <span className={styles.statusPill} data-status={label.toLowerCase().replace(" ", "-")}>
            {label}
          </span>
          <Link href={`/business/listings/${listing.id}/preview`} className={styles.pillButton}>
            Preview
          </Link>
          {canEdit ? (
            <>
              <Link href={editHref(listing.id)} className={`${styles.pillButton} ${styles.pillDark}`}>
                Edit listing
              </Link>
              <div className={styles.moreWrap} ref={ref}>
                <button type="button" className={styles.moreButton} aria-haspopup="menu" aria-expanded={menu} aria-label="More actions" onClick={() => setMenu((m) => !m)}>
                  •••
                </button>
                {menu ? (
                  <div className={styles.menu} role="menu">
                    <button role="menuitem" type="button" className={styles.menuItem} disabled={actions.busy} onClick={() => { setMenu(false); void actions.duplicate(); }}>
                      Duplicate
                    </button>
                    {listing.status === "published" ? (
                      <button role="menuitem" type="button" className={styles.menuItem} onClick={() => { setMenu(false); void actions.setStatus("draft", "Unpublished. Guests can't see it until you publish again."); }}>
                        Unpublish
                      </button>
                    ) : null}
                    {listing.status === "archived" ? (
                      <button role="menuitem" type="button" className={styles.menuItem} onClick={() => { setMenu(false); void actions.setStatus("draft", "Unarchived. It's a draft again."); }}>
                        Unarchive
                      </button>
                    ) : (
                      <button role="menuitem" type="button" className={styles.menuItem} onClick={() => { setMenu(false); void actions.setStatus("archived", "Archived. Guests can't see or book it."); }}>
                        Archive
                      </button>
                    )}
                    {listing.status === "draft" ? (
                      <button role="menuitem" type="button" className={`${styles.menuItem} ${styles.menuDanger}`} onClick={() => { setMenu(false); setConfirm(true); }}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Delete this draft?"
        confirmLabel="Delete draft"
        busy={actions.busy}
        onCancel={() => setConfirm(false)}
        onConfirm={() => void actions.deleteDraft()}
      >
        “{listing.title}” and its photos, prices and schedule will be deleted. This can&apos;t be undone.
      </ConfirmDialog>
    </header>
  );
}
