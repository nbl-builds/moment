import { mobileFrame } from '@moment/shared';

// Measurements from Figma "Onboarding 1" (428 x 926 frame, 34pt home indicator).
// Vertical positions are measured from the bottom so the layout holds on any height.

/** Gradient starts 330pt from the top (596pt tall) and is solid from 71.354%. */
export const GRADIENT_HEIGHT_RATIO = 596 / mobileFrame.height;
export const GRADIENT_SOLID_STOP = '71.354%';

/** Skip / Next sit 37pt above the frame bottom: 3pt above the 34pt home indicator. */
export const FOOTER_GAP_ABOVE_SAFE_AREA = 3;
/** Horizontal inset of Skip and Next. */
export const FOOTER_HORIZONTAL_INSET = 28;
/** Space between the dots and the Skip / Next row. */
export const DOTS_TO_FOOTER = 40;
/** Space between the subtitle and the dots. */
export const TEXT_TO_DOTS = 22;
/** Title text box width (wraps to two lines). */
export const TITLE_MAX_WIDTH = 316;

export const DOT_SIZE = 10;
