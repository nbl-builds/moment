"use client";

import type { WizardStep } from "@moment/shared";
import type { StepContext } from "../wizard";
import { BasicsStep, CategoryStep, TypeStep } from "./idea";
import { DetailsStep, LocationStep, PhotosStep, ProvideStep, RequirementsStep, TitleStep } from "./page";
import { AvailabilityStep, BookingStep, DiscountStep, GroupStep, PricingStep, StaffStep } from "./settings";
import { HostStep, ReviewStep } from "./submission";

const STEPS: Record<WizardStep, (ctx: StepContext) => React.ReactNode> = {
  type: TypeStep,
  basics: BasicsStep,
  category: CategoryStep,
  title: TitleStep,
  photos: PhotosStep,
  details: DetailsStep,
  location: LocationStep,
  provide: ProvideStep,
  requirements: RequirementsStep,
  group: GroupStep,
  staff: StaffStep,
  availability: AvailabilityStep,
  booking: BookingStep,
  pricing: PricingStep,
  discount: DiscountStep,
  host: HostStep,
  review: ReviewStep,
};

export function StepView({ step, ctx }: { step: WizardStep; ctx: StepContext }) {
  const View = STEPS[step];
  return <View {...ctx} />;
}
