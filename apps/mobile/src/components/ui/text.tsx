import { colors, fontFamily, textStyles, type ColorToken, type TextStyleToken } from '@moment/shared';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

export type FontWeightToken = keyof typeof fontFamily;

export interface TextProps extends RNTextProps {
  /** Figma text style. Defaults to body16. */
  variant?: TextStyleToken;
  /** Manrope weight. Headings default to bold, everything else to regular. */
  weight?: FontWeightToken;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
}

const HEADINGS: ReadonlySet<TextStyleToken> = new Set(['h1', 'h2', 'h3', 'h4']);

/** Resolved style for a Figma text style, for places that cannot use <Text> (e.g. TextInput). */
export function textStyle(variant: TextStyleToken, weight?: FontWeightToken): TextStyle {
  const t = textStyles[variant];
  return {
    fontFamily: fontFamily[weight ?? (HEADINGS.has(variant) ? 'bold' : 'regular')],
    fontSize: t.fontSize,
    lineHeight: t.fontSize * t.lineHeight,
    letterSpacing: t.letterSpacing,
  };
}

/**
 * Text in Manrope using a Figma text style (Typography page). Use this instead
 * of React Native's Text so sizes, line heights and colours always come from tokens.
 */
export function Text({ variant = 'body16', weight, color = 'text', align, style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      accessibilityRole={rest.accessibilityRole ?? (HEADINGS.has(variant) ? 'header' : undefined)}
      style={[textStyle(variant, weight), { color: colors[color], textAlign: align }, style]}
    />
  );
}
