import { colors } from '@moment/shared';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Same look as Slider (Figma Filters 22:1432): 4pt track, 16pt black thumbs, 20pt row.
const TRACK = 4;
const THUMB = 16;
const HEIGHT = 20;

export interface RangeSliderProps {
  low: number;
  high: number;
  min: number;
  max: number;
  step: number;
  onChange: (low: number, high: number) => void;
  accessibilityLabel: string;
  /** Read out for each thumb, e.g. "Minimum Rs 500". */
  lowValueText: string;
  highValueText: string;
}

const clamp = (n: number, lo: number, hi: number) => {
  'worklet';
  return Math.min(hi, Math.max(lo, n));
};

/**
 * Two-thumb slider for a min-max range (Price Range). Drag or tap the track:
 * the nearer thumb moves, on the UI thread, and stops at the other. VoiceOver / TalkBack adjust each thumb
 * separately (swipe up/down).
 */
export function RangeSlider({
  low,
  high,
  min,
  max,
  step,
  onChange,
  accessibilityLabel,
  lowValueText,
  highValueText,
}: RangeSliderProps) {
  const width = useSharedValue(0);
  const toP = (v: number) => (v - min) / (max - min);
  const lowP = useSharedValue(toP(low));
  const highP = useSharedValue(toP(high));
  /** 0 = moving the low thumb, 1 = the high one. */
  const active = useSharedValue(0);
  const last = useRef({ low, high });
  const stepP = step / (max - min);

  useEffect(() => {
    last.current = { low, high };
    lowP.set((low - min) / (max - min));
    highP.set((high - min) / (max - min));
  }, [low, high, min, max, lowP, highP]);

  const toValue = (p: number) => Math.min(max, Math.max(min, Math.round((min + p * (max - min)) / step) * step));
  const emit = (lo: number, hi: number) => {
    const next = { low: toValue(lo), high: toValue(hi) };
    if (next.low !== last.current.low || next.high !== last.current.high) {
      last.current = next;
      onChange(next.low, next.high);
    }
  };

  // One gesture on the whole track: it moves whichever thumb is nearer the touch.
  const moveTo = (x: number, pick: boolean) => {
    'worklet';
    if (width.get() <= 0) return;
    const p = clamp(x / width.get(), 0, 1);
    if (pick) active.set(Math.abs(p - lowP.get()) <= Math.abs(p - highP.get()) && p <= highP.get() ? 0 : 1);
    if (active.get() === 0) lowP.set(clamp(p, 0, highP.get() - stepP));
    else highP.set(clamp(p, lowP.get() + stepP, 1));
    scheduleOnRN(emit, lowP.get(), highP.get());
  };

  const pan = usePanGesture({
    activeOffsetX: [-4, 4],
    failOffsetY: [-10, 10],
    onActivate: (e) => {
      'worklet';
      moveTo(e.x, true);
    },
    onUpdate: (e) => {
      'worklet';
      moveTo(e.x, false);
    },
  });
  const tap = useTapGesture({
    onActivate: (e) => {
      'worklet';
      moveTo(e.x, true);
    },
  });
  const gesture = useCompetingGestures(pan, tap);

  const fillStyle = useAnimatedStyle(() => ({
    left: lowP.get() * width.get(),
    width: (highP.get() - lowP.get()) * width.get(),
  }));
  const lowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: lowP.get() * width.get() - THUMB / 2 }],
  }));
  const highStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: highP.get() * width.get() - THUMB / 2 }],
  }));

  const nudgeLow = (d: 1 | -1) => {
    const next = Math.min(high - step, Math.max(min, low + d * step));
    if (next !== low) onChange(next, high);
  };
  const nudgeHigh = (d: 1 | -1) => {
    const next = Math.max(low + step, Math.min(max, high + d * step));
    if (next !== high) onChange(low, next);
  };
  const actions = [{ name: 'increment' }, { name: 'decrement' }] as const;

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.row} onLayout={(e: LayoutChangeEvent) => width.set(e.nativeEvent.layout.width)}>
        <View style={styles.track} />
        <Animated.View style={[styles.fill, fillStyle]} />
        <Animated.View
          style={[styles.thumb, lowStyle]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${accessibilityLabel}, minimum`}
          accessibilityValue={{ text: lowValueText }}
          accessibilityActions={[...actions]}
          onAccessibilityAction={(e) => nudgeLow(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        />
        <Animated.View
          style={[styles.thumb, highStyle]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${accessibilityLabel}, maximum`}
          accessibilityValue={{ text: highValueText }}
          accessibilityActions={[...actions]}
          onAccessibilityAction={(e) => nudgeHigh(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    height: HEIGHT,
    justifyContent: 'center',
  },
  track: {
    height: TRACK,
    borderRadius: 3,
    backgroundColor: colors.track,
  },
  fill: {
    position: 'absolute',
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
