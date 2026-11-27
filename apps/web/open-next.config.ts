import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Prerendered pages (e.g. /business) are read from the Worker's static assets.
// Without an incremental cache they intermittently 404'd. No revalidation is
// used, so the read-only static assets cache is enough (no R2 / KV needed).
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
