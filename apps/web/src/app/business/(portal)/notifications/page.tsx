import type { Metadata } from "next";
import { PortalPlaceholder } from "@/features/portal/placeholder";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return <PortalPlaceholder title="Notifications" body="New bookings, messages and reviews will be listed here. This page comes in a later section." />;
}
