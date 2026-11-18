import { colors } from './colors';
import { radii, spacing } from './layout';
import { textStyles } from './typography';

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** Tokens as CSS custom properties, for the web app. */
export const cssVariables: Record<string, string> = {
  ...Object.fromEntries(Object.entries(colors).map(([k, v]) => [`--color-${kebab(k)}`, v])),
  ...Object.fromEntries(Object.entries(spacing).map(([k, v]) => [`--space-${k}`, `${v}px`])),
  ...Object.fromEntries(Object.entries(radii).map(([k, v]) => [`--radius-${k}`, `${v}px`])),
  ...Object.fromEntries(
    Object.entries(textStyles).flatMap(([k, v]) => [
      [`--text-${k}-size`, `${v.fontSize}px`],
      [`--text-${k}-line-height`, String(v.lineHeight)],
      [`--text-${k}-weight`, v.fontWeight],
    ]),
  ),
};
