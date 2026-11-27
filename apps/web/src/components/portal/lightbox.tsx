"use client";

/* eslint-disable @next/next/no-img-element -- photos come from Supabase Storage */
import { useEffect } from "react";
import styles from "./lightbox.module.css";

/** Full-screen photo viewer: arrows, Esc and the backdrop close it. */
export function Lightbox({ photos, index, onIndex, onClose }: { photos: string[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % photos.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + photos.length) % photos.length);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, photos.length, onClose, onIndex]);

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label={`Photo ${index + 1} of ${photos.length}`}>
      <button type="button" className={styles.backdrop} onClick={onClose} aria-label="Close photos" />
      <img src={photos[index]} alt="" className={styles.image} />
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
        ×
      </button>
      {photos.length > 1 ? (
        <>
          <button type="button" className={`${styles.arrow} ${styles.prev}`} onClick={() => onIndex((index - 1 + photos.length) % photos.length)} aria-label="Previous photo">
            ‹
          </button>
          <button type="button" className={`${styles.arrow} ${styles.next}`} onClick={() => onIndex((index + 1) % photos.length)} aria-label="Next photo">
            ›
          </button>
          <p className={styles.count}>
            {index + 1} / {photos.length}
          </p>
        </>
      ) : null}
    </div>
  );
}
