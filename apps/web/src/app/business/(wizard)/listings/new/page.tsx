import type { Metadata } from "next";
import { loadWizard } from "@/features/listing-wizard/load";
import { ListingWizard } from "@/features/listing-wizard/wizard";

export const metadata: Metadata = { title: "Create new listing" };

/** Step 1 (Experience Type). Choosing a type creates the draft and moves to its edit route. */
export default async function NewListingPage() {
  const { data, today } = await loadWizard(null);
  return <ListingWizard data={data} step="type" today={today} />;
}
