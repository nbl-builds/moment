"use client";

/* eslint-disable @next/next/no-img-element -- avatars come from Supabase Storage */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Logo } from "@/components/portal/logo";
import { PortalIcon } from "@/components/portal/icon";
import { businessRoutes } from "@/config/site";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { switchBusiness } from "../actions";
import { HelpSheet } from "./help-sheet";
import styles from "./top-bar.module.css";

export const PORTAL_NAV = [
  { href: businessRoutes.dashboard, label: "Dashboard" },
  { href: "/business/calendar", label: "Calendar" },
  { href: "/business/inbox", label: "Inbox" },
  { href: "/business/listings", label: "Listings" },
  { href: "/business/insights", label: "Insights" },
] as const;

type Membership = { role: string; business: { id: string; name: string } };

/** Figma 209:930: logo, nav pills (active = black), +, bell, avatar menu (203:763). */
export function TopBar({
  displayName,
  avatarUrl,
  businessId,
  memberships,
  hasUnreadNotifications,
  canCreateListing,
}: {
  displayName: string;
  avatarUrl: string | null;
  businessId: string;
  memberships: Membership[];
  hasUnreadNotifications: boolean;
  canCreateListing: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const api = useBrowserApi();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Close the phone menu when the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setNavOpen(false);
    setMenuOpen(false);
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`) || (href === "/business/insights" && pathname.startsWith("/business/reviews"));

  async function logout() {
    await api.auth.signOut().catch(() => undefined);
    router.replace(`${businessRoutes.login}?toast=signed-out`);
    router.refresh();
  }

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <Link href={businessRoutes.dashboard} className={styles.logo} aria-label="Moment dashboard">
          <Logo tone="dark" />
        </Link>

        <nav className={`${styles.nav} ${navOpen ? styles.navOpen : ""}`} aria-label="Portal">
          {PORTAL_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={styles.pill} data-active={isActive(item.href) ? "true" : undefined} aria-current={isActive(item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          {canCreateListing ? (
            <Link href="/business/listings/new" className={styles.iconButton} aria-label="Create new listing" title="Create new listing">
              <PortalIcon name="plus-circle-dotted" />
            </Link>
          ) : null}
          <Link href="/business/notifications" className={styles.iconButton} aria-label={hasUnreadNotifications ? "Notifications, unread" : "Notifications"}>
            <PortalIcon name="notification" />
            {hasUnreadNotifications ? <span className={styles.dot} aria-hidden /> : null}
          </Link>
          <div className={styles.menuWrap} ref={menuRef}>
            <button type="button" className={styles.avatarButton} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} aria-label={`Account menu for ${displayName}`}>
              {avatarUrl ? <img src={avatarUrl} alt="" className={styles.avatar} /> : <span className={styles.avatarFallback}>{displayName.slice(0, 1).toUpperCase()}</span>}
              <span className={styles.chevron} aria-hidden>
                <PortalIcon name="direction-down" />
              </span>
              {hasUnreadNotifications ? <span className={styles.avatarDot} aria-hidden /> : null}
            </button>
            {menuOpen ? (
              <div className={styles.menu} role="menu">
                <Link role="menuitem" href="/business/profile" className={styles.menuItem}>
                  Profile
                </Link>
                <Link role="menuitem" href="/business/settings" className={styles.menuItem}>
                  Account Settings
                </Link>
                <button role="menuitem" type="button" className={styles.menuItem} onClick={() => { setMenuOpen(false); setHelpOpen(true); }}>
                  Get Help
                </button>
                {memberships.length > 1 ? (
                  <div className={styles.switcher} role="group" aria-label="Switch business">
                    <span className={styles.switcherLabel}>Switch business</span>
                    {memberships.map((m) => (
                      <button
                        key={m.business.id}
                        role="menuitemradio"
                        aria-checked={m.business.id === businessId}
                        type="button"
                        disabled={pending}
                        className={styles.menuItem}
                        data-current={m.business.id === businessId ? "true" : undefined}
                        onClick={() =>
                          startTransition(async () => {
                            await switchBusiness(m.business.id);
                            setMenuOpen(false);
                            router.refresh();
                          })
                        }
                      >
                        {m.business.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                <button role="menuitem" type="button" className={`${styles.menuItem} ${styles.logout}`} onClick={logout}>
                  Logout
                </button>
              </div>
            ) : null}
          </div>
          <button type="button" className={styles.burger} aria-expanded={navOpen} aria-label="Menu" onClick={() => setNavOpen((o) => !o)}>
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </header>
  );
}
