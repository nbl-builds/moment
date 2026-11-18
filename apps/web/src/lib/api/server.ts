import { createMomentApi } from "@moment/shared";
import { createClient } from "../supabase/server";

/** Typed Moment API for Server Components, Server Actions and Route Handlers. Create one per request. */
export async function createServerApi() {
  return createMomentApi(await createClient());
}
