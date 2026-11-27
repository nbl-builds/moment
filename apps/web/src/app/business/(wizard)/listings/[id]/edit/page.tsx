import { isWizardStep, wizardSteps } from "@moment/shared";
import type { Metadata } from "next";
import { loadWizard } from "@/features/listing-wizard/load";
import { ListingWizard } from "@/features/listing-wizard/wizard";

export const metadata: Metadata = { title: "Edit listing" };

/** The wizard on an existing listing: `?step=` opens a step, otherwise it resumes where the business left off. */
export default async function EditListingPage({ params, searchParams }: PageProps<"/business/listings/[id]/edit">) {
  const [{ id }, { step }] = await Promise.all([params, searchParams]);
  const { data, today } = await loadWizard(id);
  const listing = data.listing!;
  const steps = wizardSteps(listing.type);
  const resume = listing.wizard_step && isWizardStep(listing.wizard_step) ? steps[Math.min(steps.indexOf(listing.wizard_step) + 1, steps.length - 1)] : null;
  const start = isWizardStep(step) && steps.includes(step) ? step : (resume ?? listing.missing[0]?.step ?? "basics");
  return <ListingWizard data={data} step={start ?? "basics"} today={today} />;
}
