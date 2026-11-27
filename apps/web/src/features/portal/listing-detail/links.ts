import type { ListingStep } from "@moment/shared";
import { appEnv } from "@/config/site";

export const editHref = (id: string, step?: ListingStep) => `/business/listings/${id}/edit${step ? `?step=${step}` : ""}`;

/** Deep link that opens the listing in the Moment app (staging app has its own scheme). */
export function appLink(listing: { id: string; type: string; business?: { id: string } | null }, businessSlug?: string) {
  const scheme = appEnv === "staging" ? "moment-staging" : "moment";
  return listing.type === "service" && businessSlug ? `${scheme}://business/${businessSlug}` : `${scheme}://experience/${listing.id}`;
}

export type ListingStatusLabel = "Published" | "Draft" | "Under review" | "Archived";

/** Pill label: waiting for Moment's review, or published by a business that isn't approved yet, is "Under review". */
export function statusLabel(status: string, businessStatus: string): ListingStatusLabel {
  if (status === "archived") return "Archived";
  if (status === "draft") return "Draft";
  if (status === "pending_review") return "Under review";
  return businessStatus === "active" ? "Published" : "Under review";
}
