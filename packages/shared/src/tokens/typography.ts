/**
 * Typography: Manrope only.
 * lineHeight is a multiplier; use `lineHeightPx()` for React Native,
 * which expects absolute values.
 */
export const fontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

/** CSS font-family name (web). */
export const webFontFamily = 'Manrope' as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const textStyles = {
  /** Figma: Mobile Headings / Mobile H1. */
  h1: { fontSize: 32, lineHeight: 1.2, fontWeight: fontWeight.bold, letterSpacing: 0 },
  /** Figma: Mobile Headings / Mobile H2. */
  h2: { fontSize: 28, lineHeight: 1.2, fontWeight: fontWeight.bold, letterSpacing: 0 },
  /** Figma: Mobile Headings / Mobile H3. */
  h3: { fontSize: 24, lineHeight: 1.5, fontWeight: fontWeight.bold, letterSpacing: 0 },
  h4: { fontSize: 20, lineHeight: 1.2, fontWeight: fontWeight.bold, letterSpacing: 0 },
  /** Figma: Body XX-Large - 18. */
  body18: { fontSize: 18, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  body16: { fontSize: 16, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  /** Figma: Body Large - 15. */
  body15: { fontSize: 15, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  body14: { fontSize: 14, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  body12: { fontSize: 12, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  body10: { fontSize: 10, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  /** Figma: Mobile App Sub Text / ST1 (also Web-text / Body / Regular): 1.4 line height, 1% tracking. */
  subText16: { fontSize: 16, lineHeight: 1.4, fontWeight: fontWeight.regular, letterSpacing: 0.16 },
  /** Figma: Mobile App Sub Text / ST3. */
  subText14: { fontSize: 14, lineHeight: 1.4, fontWeight: fontWeight.regular, letterSpacing: 0.14 },
  /** Figma: calendar days and weekdays (22:1960), 13pt / 1.4 / 1%. */
  subText13: { fontSize: 13, lineHeight: 1.4, fontWeight: fontWeight.regular, letterSpacing: 0.13 },
  /** Figma: Mobile App Sub Text / ST5. */
  subText12: { fontSize: 12, lineHeight: 1.4, fontWeight: fontWeight.regular, letterSpacing: 0.12 },
  /** Figma: Mobile App Sub Text / ST7. */
  subText10: { fontSize: 10, lineHeight: 1.4, fontWeight: fontWeight.regular, letterSpacing: 0.1 },
} as const;

export type TextStyleToken = keyof typeof textStyles;

export const lineHeightPx = (style: TextStyleToken): number =>
  Math.round(textStyles[style].fontSize * textStyles[style].lineHeight);
