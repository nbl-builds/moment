/** Spacing scale (px / dp). */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Mobile frame size used in the Figma file. */
export const mobileFrame = { width: 428, height: 926 } as const;

/** Button sizes from the Figma button component. */
export const buttonSizes = {
  large: { height: 56, paddingHorizontal: spacing.xl, textStyle: 'body16' },
  small: { height: 40, paddingHorizontal: spacing.lg, textStyle: 'body14' },
} as const;
