import { PortalPlaceholder } from "@/features/portal/placeholder";

/** Unknown id, deleted listing, or a listing of another business. */
export default function ListingNotFound() {
  return (
    <PortalPlaceholder
      title="Listing not found"
      body="This listing doesn't exist, was deleted, or belongs to a business you can't access."
      back={{ href: "/business/listings", label: "Back to listings" }}
    />
  );
}
