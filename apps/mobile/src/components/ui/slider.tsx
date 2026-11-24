import { colors } from '@moment/shared';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/** Figma: Filters sliders (22:1432): 4pt track, 16pt black thumb, 20pt tall row. */
const TRACK = 4;
const THUMB = 16;
const HEIGHT = 20;

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Read out by screen readers, e.g. "Within 10 km". */
  accessibilityLabel: string;
  accessibilityValueText: string;
  disabled?: boolean;
}

const clamp01 = (n: number) => {
  'worklet';
  return Math.min(1, Math.max(0, n));
};

/**
 * Single-value slider: drag or tap the track. Runs on the UI thread and
 * reports stepped values. Adjustable with VoiceOver / TalkBack (swipe up/down).
 */
export function Slider({ value, min, max, step, onChange, accessibilityLabel, accessibilityValueText, disabled }: SliderProps) {
  const width = useSharedValue(0);
  const progress = useSharedValue((value - min) / (max - min));
  const lastEmitted = useRef(value);

  // Follow outside changes (reset, prefill).
  useEffect(() => {
    lastEmitted.current = value;
    progress.set((value - min) / (max - min));
  }, [value, min, max, progress]);

  const emit = (p: number) => {
    const stepped = Math.round((min + p * (max - min)) / step) * step;
    const next = Math.min(max, Math.max(min, stepped));
    if (next !== lastEmitted.current) {
      lastEmitted.current = next;
      onChange(next);
    }
  };

  const moveTo = (x: number) => {
    'worklet';
    if (width.get() <= 0) return;
    const p = clamp01(x / width.get());
    progress.set(p);
    scheduleOnRN(emit, p);
  };

  const pan = usePanGesture({
    enabled: !disabled,
    activeOffsetX: [-4, 4],
    failOffsetY: [-10, 10],
    onUpdate: (e) => {
      'worklet';
      moveTo(e.x);
    },
  });
  const tap = useTapGesture({
    enabled: !disabled,
    onActivate: (e) => {
      'worklet';
      moveTo(e.x);
    },
  });
  const gesture = useCompetingGestures(pan, tap);

  const fillStyle = useAnimatedStyle(() => ({ width: progress.get() * width.get() }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.get() * width.get() - THUMB / 2 }] }));

  const nudge = (direction: 1 | -1) => {
    const next = Math.min(max, Math.max(min, value + direction * step));
    if (next !== value) onChange(next);
  };

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[styles.row, disabled && styles.disabled]}
        onLayout={(e: LayoutChangeEvent) => width.set(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: accessibilityValueText }}
        accessibilityState={{ disabled: Boolean(disabled) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      >
        <View style={styles.track} />
        <Animated.View style={[styles.fill, fillStyle]} />
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    height: HEIGHT,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  track: {
    height: TRACK,
    borderRadius: 3,
    backgroundColor: colors.track,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: TRACK,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.secondary,
  },
});
