/**
 * Moment colour palette, from the Figma design system.
 * Never hardcode colours in the apps: import from here.
 */
export const palette = {
  lime: '#CFFF58',
  nearBlack: '#131617',
  nearBlackTint2: '#5D6061', // Figma: Secondary Color / S Tint 2
  nearBlackTint3: '#828586', // Figma: Secondary Color / S Tint 3
  nearBlackTint5: '#CCCFD0', // Figma: Secondary Color / S Tint 5
  nearBlackTint6: '#F1F3F4', // Figma: Secondary Color / S Tint 6
  orange: '#FF8A3D', // TODO: confirm exact "Third" orange hex from Figma
  black: '#1A1A1A',
  white: '#FFFFFF',
  pureBlack: '#000000', // Figma: Black Color / Black Color
  red: '#D61600', // Figma: Red Color / Red Color
} as const;

/** Semantic colour roles used by components. */
export const colors = {
  primary: palette.lime,
  onPrimary: palette.nearBlack,
  secondary: palette.nearBlack,
  onSecondary: palette.white,
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
  /** Dimmed backdrop behind sheets and dialogs. */
  scrim: withAlpha(palette.pureBlack, 0.5),
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
