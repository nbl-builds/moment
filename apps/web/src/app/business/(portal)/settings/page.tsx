import type { Metadata } from "next";
import { PortalPlaceholder } from "@/features/portal/placeholder";

export const metadata: Metadata = { title: "Account settings" };

export default function SettingsPage() {
  return <PortalPlaceholder title="Account settings" body="Password, team members, payout details and notification settings will live here. This page comes in a later section." />;
}
