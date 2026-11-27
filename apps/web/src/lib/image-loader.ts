// next/image loader for Cloudflare Workers, where the Next.js image optimizer
// doesn't run. Auth photos are pre-optimised WebP files in two widths
// (`<name>-710.webp`, `<name>-1420.webp`, made from the Figma exports);
// everything else is served as is.
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  const photo = /^\/business\/auth\/([a-z-]+)\.webp$/.exec(src);
  if (photo) return `/business/auth/${photo[1]}-${width <= 710 ? 710 : 1420}.webp`;
  return src;
}
