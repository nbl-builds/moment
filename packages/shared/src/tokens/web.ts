import { palette } from './colors';
import { fontWeight } from './typography';

/**
 * Web tokens for apps/web (business portal first), from the Moment Business App
 * Figma file (Colors 4:139, Typography 111:146, Buttons 127:886 and the auth
 * frames on "Business Web App Design"). Shared colour roles live in `colors`;
 * these are the web-only additions. All of them are emitted as CSS variables by
 * `cssVariables` (`--color-*`, `--text-*`, `--web-*`).
 */
export const webColors = {
  /** Secondary text on the portal (S Tint 2). */
  textMuted: palette.nearBlackTint2,
  /** Web-Field fill, social buttons, unselected tiles (S Tint 6). */
  field: palette.nearBlackTint6,
  /** Placeholder dots in empty OTP cells (S Tint 5). */
  otpDot: palette.nearBlackTint5,
  /** Disabled button: fill S Tint 5, label S Tint 2 (Figma "Continue" 472:2009). */
  buttonDisabled: palette.nearBlackTint5,
  onButtonDisabled: palette.nearBlackTint2,
  /** "or" divider lines (Black Tint 6). */
  hairline: palette.grey82,
  /** Wrong code: OTP cell fill and border (495:2167). */
  otpErrorSurface: palette.redTint,
  otpErrorBorder: palette.coralShade,
  /** Padlock badge on "Enter Verification Code" (P Tint 6, icon P Shade 2). */
  badgeSurface: palette.limeTint6,
  badgeIcon: palette.limeShade2,
  /** Category and type icons (Third Color). */
  accent: palette.orange,
  /** Under-review banner on the dashboard (Third tints). */
  noticeSurface: palette.orangeTint6,
  noticeBorder: palette.orangeTint4,
  noticeText: palette.orangeShade3,
  /** Toasts. */
  toast: palette.nearBlack,
  onToast: palette.white,
} as const;

/**
 * Web type scale. Figma Typography page: H1 76 Black, H2 61, H3 49, H4 39 Bold;
 * body XX-Large 25, X-Large 20, Large 18, Regular 16, Small 14, X-Small 12, all
 * line height 1.5. "Headings/H5" (32 Bold, 1% tracking) is the auth page title.
 * "Web-text/Body/Regular" (16 / 1.4 / 1%) is field text and social buttons.
 */
export const webTextStyles = {
  // Figma says Black (900); Manrope stops at ExtraBold (800).
  webH1: { fontSize: 76, lineHeight: 1.5, fontWeight: fontWeight.extrabold, letterSpacing: 0 },
  webH2: { fontSize: 61, lineHeight: 1.5, fontWeight: fontWeight.bold, letterSpacing: 0 },
  webH3: { fontSize: 49, lineHeight: 1.5, fontWeight: fontWeight.bold, letterSpacing: 0 },
  webH4: { fontSize: 39, lineHeight: 1.5, fontWeight: fontWeight.bold, letterSpacing: 0 },
  webH5: { fontSize: 32, lineHeight: 1.5, fontWeight: fontWeight.bold, letterSpacing: 0.32 },
  webBody25: { fontSize: 25, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  webBody20: { fontSize: 20, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  /** "Didn't get a code? Send again" (20 / 1.4 / 1%). */
  webBody20Tight: { fontSize: 20, lineHeight: 1.4, fontWeight: fontWeight.regular, letterSpacing: 0.2 },
  webBody18: { fontSize: 18, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  webBody16: { fontSize: 16, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  webField16: { fontSize: 16, lineHeight: 1.4, fontWeight: fontWeight.regular, letterSpacing: 0.16 },
  webBody14: { fontSize: 14, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  /** Buttons on the Buttons page use 1.2 line height (Contact Us, Get Started). */
  webButton14: { fontSize: 14, lineHeight: 1.2, fontWeight: fontWeight.semibold, letterSpacing: 0 },
  webButton16: { fontSize: 16, lineHeight: 1.2, fontWeight: fontWeight.semibold, letterSpacing: 0 },
  webBody12: { fontSize: 12, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
} as const;

export type WebTextStyleToken = keyof typeof webTextStyles;

/** Sizes in px. Figma frames are 1440 x 1024. */
export const webLayout = {
  frameWidth: 1440,
  frameHeight: 1024,
  /** Auth split screen: photo column 710 of 1440. */
  authPhotoWidth: 710,
  /** Below this width the photo is hidden and the form is centred. */
  authCollapse: 1024,
  /** Form column: 480 wide (fields, buttons), header inset 80 / 30. */
  authFormWidth: 480,
  authWideFormWidth: 522,
  authTileGridWidth: 544,
  authHeaderInsetX: 80,
  authHeaderInsetY: 30,
  /** Phone-width gutter. */
  gutter: 16,
  /** Web-Field: 60 tall, 18 padding, 10 radius; label 10 above; 24 between fields. */
  fieldHeight: 60,
  fieldLabelGap: 10,
  fieldStackGap: 24,
  fieldPaddingX: 18,
  fieldRadius: 10,
  /** Full-width form buttons are 58 tall with a 10 radius. */
  formButtonHeight: 58,
  /** OTP: six 72 cells, 10 apart, radius 15; empty dot 18. */
  otpCell: 72,
  otpGap: 10,
  otpRadius: 15,
  otpDot: 18,
  /** Padlock badge: 30 padding, 30 radius, 80 icon. */
  badgePadding: 30,
  badgeRadius: 30,
  badgeIcon: 80,
  /** Type cards (Tell us about yourself) and category tiles. */
  cardRadius: 15,
  typeCardHeight: 120,
  tileWidth: 262,
  tileHeight: 204,
  tileGap: 20,
  tileIcon: 60,
  socialIcon: 28,
  icon: 24,
  /** Text column widths measured on the frames. */
  introWidth: 409,
  typeTextWidth: 236,
  /** Header logo offset (logo top 37 vs Contact Us 30). */
  logoTop: 37,
  /** Placeholder pages (dashboard, terms). */
  contentWidth: 960,
  readingWidth: 760,
  /** Compact type-card icon on phones. */
  compactIcon: 44,
} as const;

/**
 * Gaps measured on the Business App auth frames, in px, emitted as
 * `--web-space-<n>` (e.g. 40 between a heading block and the first field,
 * 50 between sections, 60 above a primary button).
 */
export const webSpace = [4, 8, 9, 10, 11, 12, 13, 14, 17, 18, 20, 22, 25, 30, 32, 38, 40, 50, 60, 80] as const;

/**
 * Buttons page (127:886): Small 30, Medium 40, Large 48 tall; radius 10; label
 * SemiBold 14 / 14 / 16 with 8 / 8 / 12 inner padding plus 12 / 12 / 14 outer.
 */
export const webButtonSizes = {
  small: { height: 30, paddingX: 16, radius: 8, textStyle: 'webButton14' },
  medium: { height: 40, paddingX: 20, radius: 10, textStyle: 'webButton14' },
  large: { height: 48, paddingX: 26, radius: 10, textStyle: 'webButton16' },
} as const;
