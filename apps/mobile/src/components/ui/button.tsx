import { buttonIcon, buttonSizes, colors, type ColorToken } from '@moment/shared';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, Spinner } from './icon';
import type { IconName } from './icons';
import { Text, type FontWeightToken } from './text';

export type ButtonVariant = 'primary' | 'dark' | 'light' | 'soft' | 'outline' | 'ghost';
export type ButtonSize = keyof typeof buttonSizes;

interface VariantStyle {
  background?: ColorToken;
  pressedBackground?: ColorToken;
  label: ColorToken;
  border?: ColorToken;
  /** Overrides for variants whose Figma instances differ from the base component. */
  labelWeight?: FontWeightToken;
  radius?: number;
}

/**
 * Figma: "Button" component (Buttons page) and its instances on the app screens.
 * - primary: lime; pressed and loading use P Shade 1 (component states).
 * - dark / light: the near-black "Start Now" and white "Share Link" instances on Home.
 * - soft: the grey "Continue with ..." buttons on the login sheet (medium label, radius 10).
 * - outline: the component's Ghost type (2pt border).
 * - ghost: the component's Tertiary type (no fill; 10% black when pressed).
 * Hover states have no mobile equivalent; disabled uses the component's Disabled fill.
 */
const VARIANTS: Record<ButtonVariant, VariantStyle> = {
  primary: { background: 'primary', pressedBackground: 'primaryPressed', label: 'onPrimary' },
  dark: { background: 'secondary', pressedBackground: 'secondaryTint1', label: 'onSecondary' },
  light: { background: 'white', label: 'secondary' },
  soft: { background: 'secondaryTint6', label: 'secondary', labelWeight: 'medium', radius: 10 },
  outline: { border: 'outline', label: 'secondary' },
  ghost: { label: 'secondary' },
};

const BORDER_WIDTH = 2;
/** Figma: the social buttons pin their icon 18pt from the leading edge. */
const START_ICON_INSET = 18;

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon. */
  icon?: IconName;
  /** Icon box size; defaults to 24 (16 on the small "Recommend" button in Figma 18:1062). */
  iconSize?: number;
  /**
   * `inline` (default): icon sits next to the centred label, as in the component.
   * `start`: icon pinned to the leading edge with the label centred (login sheet social buttons).
   */
  iconPlacement?: 'inline' | 'start';
  /** Keep the icon's own colours instead of tinting it with the label colour. */
  iconUntinted?: boolean;
  loading?: boolean;
  /** Stretch to the parent's width. Defaults to true for large buttons. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Extra content after the label (rare; prefer `icon`). */
  trailing?: ReactNode;
}

export function Button({
  label,
  variant = 'primary',
  size = 'large',
  icon,
  iconSize = buttonIcon.size,
  iconPlacement = 'inline',
  iconUntinted,
  loading = false,
  disabled,
  fullWidth = size === 'large',
  style,
  trailing,
  ...rest
}: ButtonProps) {
  const v = VARIANTS[variant];
  const s = buttonSizes[size];
  const inactive = Boolean(disabled) || loading;
  const labelColor: ColorToken = disabled ? 'onDisabled' : v.label;
  const iconColor = iconUntinted ? undefined : labelColor;

  return (
    <Pressable
      {...rest}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={rest.accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => {
        const background = disabled
          ? colors.disabled
          : (pressed || loading) && v.pressedBackground
            ? colors[v.pressedBackground]
            : v.background
              ? colors[v.background]
              : undefined;
        return [
          styles.base,
          {
            paddingVertical: s.paddingVertical - (v.border ? BORDER_WIDTH : 0),
            paddingHorizontal: s.paddingHorizontal - (v.border ? BORDER_WIDTH : 0),
            borderRadius: v.radius ?? s.radius,
            backgroundColor: background,
          },
          v.border && { borderWidth: BORDER_WIDTH, borderColor: colors[disabled ? 'disabled' : v.border] },
          fullWidth ? styles.fullWidth : styles.hug,
          style,
        ];
      }}
    >
      {({ pressed }) =>
        loading ? (
          <Spinner color={labelColor} />
        ) : (
          <>
            {/* Variants without a pressed colour darken by 10% (Figma: Tertiary / Pressed). */}
            {pressed && !v.pressedBackground && <View style={styles.pressedOverlay} pointerEvents="none" />}
            {icon && iconPlacement === 'start' && (
              <View style={styles.startIcon}>
                <Icon name={icon} size={iconSize} color={iconColor} />
              </View>
            )}
            {icon && iconPlacement === 'inline' && <Icon name={icon} size={iconSize} color={iconColor} />}
            <Text variant={s.textStyle} weight={v.labelWeight ?? 'bold'} color={labelColor} numberOfLines={1}>
              {label}
            </Text>
            {trailing}
          </>
        )
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: buttonIcon.gap,
    overflow: 'hidden',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  hug: {
    alignSelf: 'flex-start',
  },
  startIcon: {
    position: 'absolute',
    left: START_ICON_INSET,
  },
  pressedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.pressedOverlay,
  },
});
