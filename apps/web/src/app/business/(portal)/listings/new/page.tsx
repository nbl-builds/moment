import type { Metadata } from "next";
import { PortalPlaceholder } from "@/features/portal/placeholder";

export const metadata: Metadata = { title: "Create new listing" };

export default function NewListingPage() {
  return (
    <PortalPlaceholder
      title="Create new listing"
      body="The listing wizard (details, photos, prices, availability) is the next section."
      back={{ href: "/business/listings", label: "Back to listings" }}
    />
  );
}
