/* eslint-disable @next/next/no-img-element -- static Figma SVGs */
export type PortalIconName =
  | "google"
  | "facebook"
  | "mail"
  | "mobile"
  | "chevron-down"
  | "direction-down"
  | "direction-right"
  | "eye-disable"
  | "padlock"
  | "icon-user"
  | "icon-briefcase"
  | "cat-adventure"
  | "cat-tours"
  | "cat-food"
  | "cat-health"
  | "cat-art"
  | "cat-entertainment"
  | "cat-beauty";

/** Native sizes of the Figma exports (the SVGs' own width / height). */
const SIZES: Record<PortalIconName, [number, number]> = {
  google: [27.44, 28],
  facebook: [28, 28],
  mail: [28, 28],
  mobile: [16.33, 23.33],
  "chevron-down": [24, 24],
  "direction-down": [11.5, 5.5],
  "direction-right": [5.5, 11.5],
  "eye-disable": [24, 24],
  padlock: [80, 80],
  "icon-user": [60, 60],
  "icon-briefcase": [60, 60],
  "cat-adventure": [60.02, 52.5],
  "cat-tours": [60, 60],
  "cat-food": [60, 60],
  "cat-health": [60, 60],
  "cat-art": [47.7, 47.7],
  "cat-entertainment": [60, 60],
  "cat-beauty": [60, 60],
};

/** A Figma icon from /public/business/icons at its exported size. */
export function PortalIcon({ name, className }: { name: PortalIconName; className?: string }) {
  const [width, height] = SIZES[name];
  return <img src={`/business/icons/${name}.svg`} alt="" width={width} height={height} className={className} aria-hidden />;
}
