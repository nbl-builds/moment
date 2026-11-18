/**
 * Moment colour palette, from the Figma design system.
 * Never hardcode colours in the apps: import from here.
 */
export const palette = {
  lime: '#CFFF58',
  nearBlack: '#131617',
  orange: '#FF8A3D', // TODO: confirm exact "Third" orange hex from Figma
  black: '#1A1A1A',
  white: '#FFFFFF',
} as const;

/** Semantic colour roles used by components. */
export const colors = {
  primary: palette.lime,
  onPrimary: palette.nearBlack,
  secondary: palette.nearBlack,
  onSecondary: palette.white,
  third: palette.orange,
  onThird: palette.white,
  base: palette.black,
  white: palette.white,

  background: palette.white,
  surface: palette.white,
  text: palette.black,
  textInverse: palette.white,
} as const;

export type ColorToken = keyof typeof colors;
