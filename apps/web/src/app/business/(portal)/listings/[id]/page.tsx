import type { Metadata } from "next";
import { PortalPlaceholder } from "@/features/portal/placeholder";

export const metadata: Metadata = { title: "Listing details" };

/** Replaced by the Listing Details page (next section). */
export default async function ListingDetailsPage({ params }: PageProps<"/business/listings/[id]">) {
  const { id } = await params;
  return (
    <PortalPlaceholder
      title="Listing details"
      body={`Listing ${id}: photos, availability, reservations and reviews for one listing come in the next section.`}
      back={{ href: "/business/listings", label: "Back to listings" }}
    />
  );
}
