"use server";

import { appEnv } from "@/config/site";
import { createServerApi } from "@/lib/api/server";
import { errorMessage } from "@/lib/business/errors";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * "Submit for review". The database checks every step again and marks the
 * listing pending review. On development and staging with
 * AUTO_APPROVE_BUSINESSES=1, a listing of an active business is published at
 * once so the flow can be tested end to end (never in production).
 */
export async function submitListing(listingId: string): Promise<{ status: "pending_review" | "published" } | { error: string }> {
  const api = await createServerApi();
  try {
    const listing = await api.listingEditor.submit(listingId);
    const autoApprove = process.env.AUTO_APPROVE_BUSINESSES === "1" && (appEnv === "development" || appEnv === "staging");
    if (!autoApprove) return { status: "pending_review" };
    const { data: business } = await api.db.from("businesses").select("status").eq("id", listing.business_id).single();
    if (business?.status !== "active") return { status: "pending_review" };
    const { error } = await createAdminClient().from("listings").update({ status: "published" }).eq("id", listingId).eq("status", "pending_review");
    if (error) {
      console.error("auto-approve listing failed", error);
      return { status: "pending_review" };
    }
    return { status: "published" };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
