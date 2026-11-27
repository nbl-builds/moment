"use client";

/* eslint-disable @next/next/no-img-element -- photos come from Supabase Storage */
import { useState } from "react";
import { Lightbox } from "@/components/portal/lightbox";
import styles from "./listing-detail.module.css";

const THUMBS = 4;

/** Figma 629:7412: the 847 x 447 cover (radius 10), then a thumbnail strip and "View all photos". */
export function ListingGallery({ photos, title }: { photos: { url: string; alt: string }[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) {
    return (
      <div className={`${styles.cover} ${styles.noCover}`}>
        <p>No photos yet</p>
      </div>
    );
  }
  return (
    <section aria-label={`${title} photos`}>
      <button type="button" className={styles.coverButton} onClick={() => setOpen(0)} aria-label="Open photos">
        <img src={photos[0]!.url} alt={photos[0]!.alt} className={styles.cover} />
      </button>
      {photos.length > 1 ? (
        <div className={styles.thumbs}>
          {photos.slice(1, THUMBS + 1).map((p, i) => (
            <button key={p.url + i} type="button" className={styles.thumb} onClick={() => setOpen(i + 1)} aria-label={`Open photo ${i + 2}`}>
              <img src={p.url} alt="" />
            </button>
          ))}
          <button type="button" className={styles.viewAll} onClick={() => setOpen(0)}>
            View all photos ({photos.length})
          </button>
        </div>
      ) : null}
      {open !== null ? <Lightbox photos={photos.map((p) => p.url)} index={open} onIndex={setOpen} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}
