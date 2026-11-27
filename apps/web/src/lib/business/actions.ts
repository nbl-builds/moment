"use server";

import { appEnv } from "@/config/site";
import { createServerApi } from "@/lib/api/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** True when new businesses are activated at once (never in production). */
function autoApproveEnabled() {
  return process.env.AUTO_APPROVE_BUSINESSES === "1" && (appEnv === "development" || appEnv === "staging");
}

/**
 * Called right after "Agree & Continue". With AUTO_APPROVE_BUSINESSES=1 on
 * development or staging, activates the business the signed-in user just
 * created so the portal can be tested. Otherwise does nothing: Moment reviews
 * it from the super admin.
 */
export async function autoApproveBusiness(businessId: string): Promise<{ approved: boolean }> {
  if (!autoApproveEnabled()) return { approved: false };

  // Only the owner of a business that is waiting for review.
  const api = await createServerApi();
  const user = await api.auth.getUser();
  if (!user) return { approved: false };
  const { data: member } = await api.db
    .from("business_members")
    .select("role, business:businesses!inner(status)")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (member?.role !== "owner" || member.business.status !== "pending_review") return { approved: false };

  const { error } = await createAdminClient().from("businesses").update({ status: "active" }).eq("id", businessId);
  if (error) {
    console.error("auto-approve failed", error);
    return { approved: false };
  }
  return { approved: true };
}
