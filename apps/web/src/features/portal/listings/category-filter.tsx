"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PortalIcon } from "@/components/portal/icon";
import styles from "./listings.module.css";

/** "All ▾" category menu (Figma 626:5466): the sign-up category groups. */
export function CategoryFilter({ groups, current }: { groups: { slug: string; name: string }[]; current?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const href = (slug?: string) => {
    const q = new URLSearchParams(search.toString());
    if (slug) q.set("category", slug);
    else q.delete("category");
    const s = q.toString();
    return `${pathname}${s ? `?${s}` : ""}`;
  };
  const label = groups.find((g) => g.slug === current)?.name ?? "All";

  return (
    <div className={styles.filterWrap} ref={ref}>
      <button type="button" className={styles.allButton} data-open={open ? "true" : undefined} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label}
        <PortalIcon name="direction-down-20" />
      </button>
      {open ? (
        <div className={styles.menu} role="menu">
          <Link role="menuitemradio" aria-checked={!current} href={href()} className={styles.menuItem} data-current={!current ? "true" : undefined} onClick={() => setOpen(false)}>
            All
          </Link>
          {groups.map((g) => (
            <Link key={g.slug} role="menuitemradio" aria-checked={g.slug === current} href={href(g.slug)} className={styles.menuItem} data-current={g.slug === current ? "true" : undefined} onClick={() => setOpen(false)}>
              {g.name}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
