import type { PortalIconName } from "@/components/portal/icon";

/** Figma tile icons for the sign-up category groups (by slug). */
export const CATEGORY_ICONS: Record<string, PortalIconName> = {
  adventure: "cat-adventure",
  tours: "cat-tours",
  food: "cat-food",
  "health-wellness": "cat-health",
  "art-culture": "cat-art",
  entertainment: "cat-entertainment",
  beauty: "cat-beauty",
};

export const isSignUpType = (value: unknown): value is "host" | "business" => value === "host" || value === "business";
