import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents / partialPrefetching are off: OpenNext on Cloudflare Workers
  // doesn't support Cache Components yet (requests hang). Revisit when
  // https://github.com/opennextjs/opennextjs-cloudflare/pull/1318 lands.
  transpilePackages: ["@moment/shared"],
  images: { loader: "custom", loaderFile: "./src/lib/image-loader.ts" },
};

export default nextConfig;

// Lets `next dev` use Cloudflare bindings (getCloudflareContext) locally.
import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
