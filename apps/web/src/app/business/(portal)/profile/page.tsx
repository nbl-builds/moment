import type { Metadata } from "next";
import { PortalPlaceholder } from "@/features/portal/placeholder";

export const metadata: Metadata = { title: "Business profile" };

export default function ProfilePage() {
  return <PortalPlaceholder title="Business profile" body="Your logo, description, photos, contact details and opening hours will be edited here. This page comes in a later section." />;
}
