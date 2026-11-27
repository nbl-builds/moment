import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache (R2/KV) yet: the portal is dynamic and per user.
export default defineCloudflareConfig({});
