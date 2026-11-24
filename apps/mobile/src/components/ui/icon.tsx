import { buttonIcon, colors, type ColorToken } from '@moment/shared';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { icons, type IconName } from './icons';

export interface IconProps {
  name: IconName;
  /** Icon box size. Defaults to 24 (the Figma icon grid). */
  size?: number;
  /** Tint. Ignored for multi-colour marks such as Google. Defaults to the SVG's own colour. */
  color?: ColorToken;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** An icon from the Figma-exported set in `icons.ts`, tinted with a colour token. */
export function Icon({ name, size = buttonIcon.size, color, style, accessibilityLabel }: IconProps) {
  const def = icons[name];
  const scale = size / buttonIcon.size;
  const glyph = 'glyph' in def ? def.glyph : undefined;
  const tint = color && !('multicolor' in def && def.multicolor) ? colors[color] : undefined;

  return (
    <View
      style={[styles.box, { width: size, height: size }, style]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
    >
      <Image
        source={def.source}
        style={glyph ? { width: glyph.width * scale, height: glyph.height * scale } : { width: size, height: size }}
        contentFit="contain"
        tintColor={tint}
      />
    </View>
  );
}

const SPIN_MS = 800;

/** The Figma loading indicator, spinning. */
export function Spinner({ size = buttonIcon.size, color }: Pick<IconProps, 'size' | 'color'>) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: SPIN_MS, easing: Easing.linear }), -1);
    return () => cancelAnimation(rotation);
  }, [rotation]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Animated.View style={spin} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <Icon name="spinner" size={size} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
