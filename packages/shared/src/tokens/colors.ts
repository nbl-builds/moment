/**
 * Moment colour palette, from the Figma design system.
 * Never hardcode colours in the apps: import from here.
 */
export const palette = {
  lime: '#CFFF58',
  limeTint1: '#D6FF70', // Figma: Primary Color / P Tint 1
  limeShade1: '#B2D84B', // Figma: Primary Color / P Shade 1
  limeShade4: '#52661E', // Figma: Primary Color / P Shade 4
  limeTint6: '#F8FFE5', // Figma: Primary Color / P Tint 6
  nearBlack: '#131617',
  nearBlackTint1: '#383B3C', // Figma: Secondary Color / S Tint 1
  nearBlackTint2: '#5D6061', // Figma: Secondary Color / S Tint 2
  nearBlackTint3: '#828586', // Figma: Secondary Color / S Tint 3
  nearBlackTint5: '#CCCFD0', // Figma: Secondary Color / S Tint 5
  nearBlackTint6: '#F1F3F4', // Figma: Secondary Color / S Tint 6
  orange: '#FF8A3D', // TODO: confirm exact "Third" orange hex from Figma
  black: '#1A1A1A',
  white: '#FFFFFF',
  pureBlack: '#000000', // Figma: Black Color / Black Color
  red: '#D61600', // Figma: Red Color / Red Color
  redTint: '#FFEEEE', // Figma: error field and OTP cell fill (7:949, 9:728)
  redBorder: '#FFA7A7', // Figma: error field and OTP cell border
  slate: '#6E7198', // Figma: Button page, Ghost border and disabled fill
} as const;

/** Semantic colour roles used by components. */
export const colors = {
  primary: palette.lime,
  onPrimary: palette.nearBlack,
  /** Primary button pressed and loading fill. */
  primaryPressed: palette.limeShade1,
  /** Icon button pressed border. */
  primaryShade4: palette.limeShade4,
  /** Pale lime badge behind the padlock on "Enter verification code". */
  primaryTint6: palette.limeTint6,
  secondary: palette.nearBlack,
  onSecondary: palette.white,
  secondaryTint1: palette.nearBlackTint1,
  secondaryTint2: palette.nearBlackTint2,
  secondaryTint3: palette.nearBlackTint3,
  secondaryTint5: palette.nearBlackTint5,
  secondaryTint6: palette.nearBlackTint6,
  third: palette.orange,
  onThird: palette.white,
  base: palette.black,
  black: palette.pureBlack,
  white: palette.white,

  background: palette.white,
  surface: palette.white,
  text: palette.black,
  textInverse: palette.white,
  /** Validation and error messages. */
  error: palette.red,
  /** Fill and border of a field or OTP cell in its error state. */
  errorSurface: palette.redTint,
  errorBorder: palette.redBorder,
  /** Dimmed backdrop behind sheets and dialogs. */
  scrim: withAlpha(palette.pureBlack, 0.5),
  /** Outline button border. */
  outline: palette.slate,
  /** Disabled button fill and label. */
  disabled: withAlpha(palette.slate, 0.2),
  onDisabled: withAlpha(palette.white, 0.8),
  /** Pressed overlay for buttons without a pressed colour of their own. */
  pressedOverlay: withAlpha(palette.pureBlack, 0.1),
} as const;

export type ColorToken = keyof typeof colors;

/**
 * A 6-digit hex colour at the given opacity, as `rgba()`.
 * withAlpha(colors.secondary, 0) -> 'rgba(19, 22, 23, 0)' (for gradients that fade a token).
 */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`withAlpha expects #RRGGBB, got ${hex}`);
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h ?? '0', 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
