import type { Metadata } from "next";
import { PortalPlaceholder } from "@/features/portal/placeholder";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({ params, searchParams }: PageProps<"/business/listings/[id]/edit">) {
  const [{ id }, { step }] = await Promise.all([params, searchParams]);
  return (
    <PortalPlaceholder
      title="Edit listing"
      body={`The listing wizard comes in the next section. It will open listing ${id}${typeof step === "string" ? ` at the "${step}" step` : ""}.`}
      back={{ href: "/business/listings", label: "Back to listings" }}
    />
  );
}
