import { colors } from '@moment/shared';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

/** Figma: "Host" toggle on Filters (22:1428): 50 x 28 track, 28pt knob. */
const TRACK = { width: 50, height: 28 } as const;
/** Figma: Group Settings (48:5138): 55pt track that stays grey; the knob turns dark when on. */
const MONO_WIDTH = 55;
const KNOB = 28;

export interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel: string;
  /** `lime` (Filters): lime track when on. `mono` (Group Settings): grey track, dark knob when on. */
  variant?: 'lime' | 'mono';
}

/**
 * On / off switch. Off matches Figma (grey track, S Tint 4 knob on the left);
 * on turns the track lime with a dark knob on the right.
 */
export function Toggle({ value, onChange, accessibilityLabel, variant = 'lime' }: ToggleProps) {
  const width = variant === 'mono' ? MONO_WIDTH : TRACK.width;
  const reduceMotion = useReducedMotion();
  const on = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    on.set(reduceMotion ? (value ? 1 : 0) : withTiming(value ? 1 : 0, { duration: 160 }));
  }, [value, on, reduceMotion]);

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: on.get() * (width - KNOB) }] }));

  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={[styles.track, { width }, value && variant === 'lime' && styles.trackOn]}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
    >
      <Animated.View style={[styles.knob, variant === 'mono' && !value && styles.knobMonoOff, value && styles.knobOn, knob]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK.width,
    height: TRACK.height,
    borderRadius: TRACK.height / 2,
    backgroundColor: colors.track,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: colors.primary,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.secondaryTint4,
  },
  knobMonoOff: {
    backgroundColor: colors.secondaryTint2,
  },
  knobOn: {
    backgroundColor: colors.secondary,
  },
});
