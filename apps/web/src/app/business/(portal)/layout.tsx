import { ReservationPanelProvider } from "@/features/portal/reservations/reservation-panel";
import { getPortalContext } from "@/features/portal/context";
import { TopBar } from "@/features/portal/shell/top-bar";
import styles from "@/features/portal/portal.module.css";

/** Every portal page after login: top bar, under-review banner, reservation panel. */
export default async function PortalLayout({ children }: LayoutProps<"/business">) {
  const ctx = await getPortalContext();
  const { count } = await ctx.api.db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.user.id)
    .is("read_at", null);

  return (
    <div className={styles.page}>
      <TopBar
        displayName={ctx.displayName}
        avatarUrl={ctx.avatarUrl}
        businessId={ctx.business.id}
        memberships={ctx.memberships.map((m) => ({ role: m.role, business: { id: m.business.id, name: m.business.name } }))}
        hasUnreadNotifications={(count ?? 0) > 0}
        canCreateListing={ctx.permissions.editListings}
      />
      {ctx.business.status === "pending_review" ? (
        <div className={styles.bannerWrap}>
          <div className={styles.banner} role="status">
            <strong>Your business is under review.</strong> Moment checks every new business before it goes live. You can set
            things up meanwhile; guests will see you once you&apos;re approved.
          </div>
        </div>
      ) : null}
      <ReservationPanelProvider businessId={ctx.business.id} timeZone={ctx.timeZone}>
        <main className={styles.main}>{children}</main>
      </ReservationPanelProvider>
    </div>
  );
}
