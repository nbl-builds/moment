import { colors } from '@moment/shared';
import { useEffect } from 'react';
import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
  width: DimensionValue;
  height: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Grey placeholder block that gently pulses while a section loads (still with Reduce Motion). */
export function Skeleton({ width, height, radius = 12, style }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(withRepeat(withTiming(0.5, { duration: 700 }), -1, true));
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.secondaryTint6 }, pulse, style]}
      accessibilityLabel="Loading"
    />
  );
}
