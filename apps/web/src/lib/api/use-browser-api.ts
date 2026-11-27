"use client";

import { useMemo } from "react";
import { createBrowserApi } from "./browser";

/** One typed Moment API per component tree (browser Supabase client, cookie session). */
export function useBrowserApi() {
  return useMemo(() => createBrowserApi(), []);
}
