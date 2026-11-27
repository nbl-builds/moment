import type { Metadata } from "next";
import { getPortalContext } from "@/features/portal/context";
import { InboxView } from "@/features/portal/inbox/inbox-view";

export const metadata: Metadata = { title: "Inbox" };

/** Figma 127:507 (inbox) and 476:1958 (time filter). `?c=<conversation id>` opens a thread. */
export default async function InboxPage({ searchParams }: PageProps<"/business/inbox">) {
  const ctx = await getPortalContext();
  const { c } = await searchParams;
  const rows = await ctx.api.portal.inbox(ctx.business.id);
  const selected = typeof c === "string" ? c : null;
  return (
    <InboxView
      businessId={ctx.business.id}
      businessLogo={ctx.api.media.url(ctx.business.logo_url)}
      userId={ctx.user.id}
      timeZone={ctx.timeZone}
      initialRows={rows}
      initialSelected={selected}
    />
  );
}
