/* eslint-disable @next/next/no-img-element -- photos come from Supabase Storage */
import { coverOf, formatDate, type ListingTab } from "@moment/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { PortalIcon } from "@/components/portal/icon";
import { getPortalContext } from "@/features/portal/context";
import { CategoryFilter } from "@/features/portal/listings/category-filter";
import { CATEGORY_ICONS } from "@/lib/business/categories";
import styles from "@/features/portal/listings/listings.module.css";

export const metadata: Metadata = { title: "Listings" };

const TITLES: Record<ListingTab, string> = { published: "My Listings", draft: "My Drafts", archived: "My Archives" };
const EMPTY: Record<ListingTab, string> = {
  published: "You have no published listings yet. Create one and guests can start booking.",
  draft: "No drafts. Listings you start but don't publish are kept here.",
  archived: "Nothing archived. Listings you retire are kept here, with their history.",
};

/** Figma 126:302 (My Listings), 626:5263 (My Drafts + category menu), 626:5371 (My Archives). */
export default async function ListingsPage({ searchParams }: PageProps<"/business/listings">) {
  const ctx = await getPortalContext();
  const params = await searchParams;
  const tab: ListingTab = params.tab === "draft" ? "draft" : params.tab === "archive" ? "archived" : "published";
  const category = typeof params.category === "string" ? params.category : undefined;

  const [listings, counts, groups] = await Promise.all([
    ctx.api.portal.listListings(ctx.business.id, tab, { groupSlug: category }),
    ctx.api.portal.listingCounts(ctx.business.id),
    ctx.api.business.listSignUpCategories(),
  ]);
  const tabHref = (t: string | null) => {
    const q = new URLSearchParams();
    if (t) q.set("tab", t);
    if (category) q.set("category", category);
    const s = q.toString();
    return `/business/listings${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <div className={styles.head}>
        <h1 className={styles.title}>{TITLES[tab]}</h1>
        <nav className={styles.filters} aria-label="Listing views">
          {tab !== "published" ? (
            <Link href={tabHref(null)} className={styles.tabLink}>
              Published ({String(counts.published).padStart(2, "0")})
            </Link>
          ) : null}
          <Link href={tabHref("draft")} className={styles.tabLink} data-active={tab === "draft" ? "true" : undefined} aria-current={tab === "draft" ? "page" : undefined}>
            Draft ({String(counts.draft).padStart(2, "0")})
          </Link>
          <Link href={tabHref("archive")} className={styles.tabLink} data-active={tab === "archived" ? "true" : undefined} aria-current={tab === "archived" ? "page" : undefined}>
            Archive
          </Link>
          <CategoryFilter groups={groups.map((g) => ({ slug: g.slug, name: g.name }))} current={category} />
        </nav>
      </div>

      {listings.length ? (
        <ul className={styles.grid}>
          {listings.map((l) => {
            const group = l.category?.parent ?? l.category;
            const icon = group ? CATEGORY_ICONS[group.slug] : undefined;
            const cover = ctx.api.media.url(coverOf(l.media));
            return (
              <li key={l.id} className={styles.card}>
                <Link href={`/business/listings/${l.id}`} className={styles.cardLink} aria-label={l.title}>
                  {cover ? <img src={cover} alt="" className={styles.photo} /> : <span className={`${styles.photo} ${styles.noPhoto}`}>No photo yet</span>}
                </Link>
                <h2 className={styles.cardTitle}>
                  <Link href={`/business/listings/${l.id}`}>{l.title}</Link>
                </h2>
                <div className={styles.meta}>
                  <div>
                    <p className={styles.date}>
                      {tab === "draft"
                        ? `Last edited ${formatDate(l.updated_at, { style: "medium", timeZone: ctx.timeZone })}`
                        : l.published_at
                          ? `Published on ${formatDate(l.published_at, { style: "medium", timeZone: ctx.timeZone })}`
                          : "Not published yet"}
                    </p>
                    {group ? (
                      <p className={styles.category}>
                        {icon ? <PortalIcon name={icon} size={24} /> : null}
                        {group.name}
                      </p>
                    ) : null}
                  </div>
                  {ctx.permissions.editListings ? (
                    <Link href={`/business/listings/${l.id}/edit`} className={styles.edit} aria-label={`Edit ${l.title}`}>
                      <PortalIcon name="edit" />
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={styles.empty}>
          <PortalIcon name="empty-envelope" />
          <p>{category ? "No listings in this category." : EMPTY[tab]}</p>
          {ctx.permissions.editListings ? (
            <Link href="/business/listings/new" className={styles.createButton}>
              Create new listing
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
