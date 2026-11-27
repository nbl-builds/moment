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
  | "cat-beauty"
  | "shield-exclamation"
  | "headphones"
  | "calendar"
  | "notification"
  | "plus-circle-dotted"
  | "empty-envelope"
  | "chevron-down-sm"
  | "chevron-up-sm"
  | "tile-background"
  | "calendar-illustration"
  | "sent"
  | "search"
  | "mic"
  | "image-add"
  | "is-typing"
  | "direction-down-20"
  | "overflow-vertical"
  | "edit"
  | "clock-circle"
  | "file-remove"
  | "task-check"
  | "upload"
  | "download"
  | "wallet"
  | "star"
  | "eye"
  | "m-mark"
  | "star-14";

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
  "shield-exclamation": [20, 20],
  headphones: [27.63, 30.46],
  calendar: [20, 20],
  notification: [23.04, 23.04],
  "plus-circle-dotted": [23.04, 23.04],
  "empty-envelope": [174.73, 162.82],
  "chevron-down-sm": [24, 24],
  "chevron-up-sm": [24, 24],
  "tile-background": [294, 236],
  "calendar-illustration": [81.64, 82.48],
  sent: [16.67, 15],
  search: [24, 24],
  mic: [20, 20],
  "image-add": [20, 20],
  "is-typing": [62, 32],
  "direction-down-20": [20, 20],
  "overflow-vertical": [24, 24],
  edit: [16.13, 16.13],
  "clock-circle": [24, 24],
  "file-remove": [24, 24],
  "task-check": [24, 24],
  upload: [24, 24],
  download: [24, 24],
  wallet: [35, 35],
  star: [42, 42],
  eye: [22.62, 22.62],
  "m-mark": [41.66, 36.71],
  "star-14": [14, 14],
};

/** A Figma icon from /public/business/icons at its exported size. */
export function PortalIcon({ name, className, size }: { name: PortalIconName; className?: string; size?: number }) {
  const [w, h] = SIZES[name];
  const scale = size ? size / Math.max(w, h) : 1;
  const width = w * scale;
  const height = h * scale;
  return <img src={`/business/icons/${name}.svg`} alt="" width={width} height={height} className={className} aria-hidden />;
}
