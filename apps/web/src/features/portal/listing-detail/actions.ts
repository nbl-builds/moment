"use client";

import type { Enums } from "@moment/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/portal/toast";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";

/** Status changes and other listing actions with toasts and a refresh. */
export function useListingActions(listingId: string) {
  const api = useBrowserApi();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run<T>(fn: () => Promise<T>, done: string | ((r: T) => string)) {
    setBusy(true);
    try {
      const r = await fn();
      toast(typeof done === "string" ? done : done(r));
      router.refresh();
      return r;
    } catch (e) {
      toast(errorMessage(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    setStatus: (status: Enums<"listing_status">, message: string) => run(() => api.portal.setListingStatus(listingId, status), message),
    setAccepting: (accepting: boolean) =>
      run(() => api.portal.setAcceptingBookings(listingId, accepting), accepting ? "Taking bookings again." : "New bookings paused. The listing stays published."),
    duplicate: async () => {
      const id = await run(() => api.portal.duplicateListing(listingId), "Copy created as a draft.");
      if (id) router.push(`/business/listings/${id}`);
    },
    deleteDraft: async () => {
      const ok = await run(() => api.portal.deleteDraft(listingId).then(() => true), "Draft deleted.");
      if (ok) router.replace("/business/listings?tab=draft");
    },
  };
}
