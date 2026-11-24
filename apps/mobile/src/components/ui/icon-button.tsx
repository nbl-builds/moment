import { colors, iconButtonSizes, type ColorToken } from '@moment/shared';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from './icon';
import type { IconName } from './icons';

export type IconButtonVariant = 'primary' | 'light';

const VARIANTS: Record<IconButtonVariant, { background: ColorToken; icon: ColorToken }> = {
  primary: { background: 'primary', icon: 'secondary' },
  light: { background: 'white', icon: 'secondary' },
};

export interface IconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  icon: IconName;
  /** Required: icon-only buttons have no visible label. */
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: keyof typeof iconButtonSizes;
  style?: StyleProp<ViewStyle>;
}

/**
 * Square icon-only button. Figma: "Icon Button" (Buttons page, 6:1901): lime,
 * 100pt, radius 36, 54pt icon; its hover border (P Shade 4) is the pressed state here.
 * `medium` is the 44pt white button on Home (heart).
 */
export function IconButton({ icon, variant = 'primary', size = 'medium', style, disabled, ...rest }: IconButtonProps) {
  const v = VARIANTS[variant];
  const s = iconButtonSizes[size];

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={[
        styles.base,
        {
          width: s.size,
          height: s.size,
          borderRadius: s.radius,
          backgroundColor: colors[disabled ? 'disabled' : v.background],
        },
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          <Icon name={icon} size={s.iconSize} color={disabled ? 'onDisabled' : v.icon} />
          {pressed && (
            <View
              pointerEvents="none"
              style={[styles.pressedBorder, { borderRadius: s.radius, borderWidth: s.pressedBorder }]}
            />
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedBorder: {
    ...StyleSheet.absoluteFill,
    borderColor: colors.primaryShade4,
  },
});
