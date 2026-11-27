"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerApi } from "@/lib/api/server";
import { ACTIVE_BUSINESS_COOKIE } from "./context";

/** Business switcher (avatar menu): only businesses the user is an active member of. */
export async function switchBusiness(businessId: string) {
  const api = await createServerApi();
  const memberships = await api.business.listMyBusinesses();
  if (!memberships.some((m) => m.business.id === businessId)) return { ok: false };
  (await cookies()).set(ACTIVE_BUSINESS_COOKIE, businessId, { path: "/business", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/business", "layout");
  return { ok: true };
}
