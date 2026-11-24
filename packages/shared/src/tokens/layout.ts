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

/**
 * Button sizes. Figma: the Button component as used on the app screens
 * (Continue: large, 18 / 32 padding, 60pt tall; "Start Now": small, 8 / 16 padding).
 * Labels are Manrope Bold; icons are 24pt with an 8pt gap.
 */
export const buttonSizes = {
  large: { paddingVertical: 18, paddingHorizontal: 32, radius: 12, textStyle: 'body16' },
  small: { paddingVertical: 8, paddingHorizontal: 16, radius: 10, textStyle: 'body12' },
} as const;

export const buttonIcon = { size: 24, gap: spacing.sm } as const;

/** Square icon-only buttons. Figma: "Icon Button" (large) and the Home heart button (medium). */
export const iconButtonSizes = {
  large: { size: 100, radius: 36, iconSize: 54, pressedBorder: 4 },
  medium: { size: 44, radius: 12, iconSize: 24, pressedBorder: 2 },
} as const;

/** Text fields. Figma: "Web-Field" on the sign in sheets. */
export const inputField = {
  height: 60,
  paddingHorizontal: 18,
  radius: 12,
  /** Gap between a leading accessory (e.g. +92) and the text. */
  accessoryGap: 9,
  labelGap: spacing.sm,
  /** Gap between the field and its helper or error text. */
  messageGap: 10,
} as const;
