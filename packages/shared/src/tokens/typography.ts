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
  h4: { fontSize: 20, lineHeight: 1.2, fontWeight: fontWeight.bold },
  body16: { fontSize: 16, lineHeight: 1.5, fontWeight: fontWeight.regular },
  body14: { fontSize: 14, lineHeight: 1.5, fontWeight: fontWeight.regular },
  body12: { fontSize: 12, lineHeight: 1.5, fontWeight: fontWeight.regular },
  body10: { fontSize: 10, lineHeight: 1.5, fontWeight: fontWeight.regular },
} as const;

export type TextStyleToken = keyof typeof textStyles;

export const lineHeightPx = (style: TextStyleToken): number =>
  Math.round(textStyles[style].fontSize * textStyles[style].lineHeight);
