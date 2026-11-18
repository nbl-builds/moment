import { createMomentApi } from "@moment/shared";
import { createClient } from "../supabase/client";

/** Typed Moment API for Client Components. Every method throws `ApiError` on failure. */
export function createBrowserApi() {
  return createMomentApi(createClient());
}
