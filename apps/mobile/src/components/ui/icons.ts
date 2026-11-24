import type { ImageSource } from 'expo-image';

export interface IconDefinition {
  source: ImageSource | number;
  /** Size of the drawn glyph when the icon box is 24pt. Defaults to the full box. */
  glyph?: { width: number; height: number };
  /** Multi-colour marks (brand logos) keep their own colours and ignore `color`. */
  multicolor?: boolean;
}

/**
 * Every icon the app uses, exported from Figma as SVG (assets/icons).
 *
 * The Figma "Icons" page is the "Huge Icons" set (huge-icon/<category>/<outline|solid|bulk>/<name>),
 * but it is not the npm Hugeicons library: names and shapes differ, and screens also use
 * icons from other sets (the login sheet's mail is Iconsax, the chevron is Feather). So we
 * export exactly what each screen uses. To add one: download the node as SVG from Figma
 * into assets/icons, register it here under the Figma layer name, and note the node.
 */
export const icons = {
  /** Figma: "Apple" on the login sheet (1825:2884). */
  apple: { source: require('../../../assets/icons/apple.svg') },
  /** Figma: "chevron-down" in the phone field (1825:2869). */
  'chevron-down': { source: require('../../../assets/icons/chevron-down.svg') },
  /** Figma: Google logo component (7:308). 39.2 x 40 mark drawn 24pt tall. */
  google: {
    source: require('../../../assets/icons/google.svg'),
    glyph: { width: 23.52, height: 24 },
    multicolor: true,
  },
  /** Figma: "house-door" in the Button component (6:1740). */
  'house-door': { source: require('../../../assets/icons/house-door.svg') },
  /** Figma: "Icon/Fill/Mail" on the login sheet (1825:2881). */
  mail: { source: require('../../../assets/icons/mail.svg') },
  /** Figma: "mobile" on the email login sheet. 14 x 20 glyph in a 24pt box. */
  mobile: { source: require('../../../assets/icons/mobile.svg'), glyph: { width: 14, height: 20 } },
  /** Figma: Button loading state ("Frame 15", 6:1702). */
  spinner: { source: require('../../../assets/icons/spinner.svg') },
} satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof icons;
