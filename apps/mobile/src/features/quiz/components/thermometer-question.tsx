import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Text } from '@/components/ui';
import { QUIZ } from '../layout';

const T = QUIZ.thermometer;
/** Height of the tube's travel, min (bottom) to max (top). */
const TRAVEL = T.tubeZero - T.tubeTop;

interface ThermometerQuestionProps {
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}

const clamp = (n: number, lo: number, hi: number) => {
  'worklet';
  return Math.min(hi, Math.max(lo, n));
};

/**
 * "What's the temperature outside on a perfect day?" (20:2453): drag the
 * thermometer (or tap it) to set whole degrees; the value shows live below.
 * Screen readers adjust it one degree at a time.
 */
export function ThermometerQuestion({ value, min, max, unit, onChange }: ThermometerQuestionProps) {
  const toY = (v: number) => T.tubeZero - ((v - min) / (max - min)) * TRAVEL;
  const fillY = useSharedValue(toY(value));
  const last = useRef(value);

  useEffect(() => {
    last.current = value;
    fillY.set(T.tubeZero - ((value - min) / (max - min)) * TRAVEL);
  }, [value, min, max, fillY]);

  const emit = (y: number) => {
    const next = Math.round(min + ((T.tubeZero - y) / TRAVEL) * (max - min));
    if (next !== last.current) {
      last.current = next;
      onChange(next);
    }
  };

  const moveTo = (y: number) => {
    'worklet';
    const clamped = clamp(y, T.tubeTop, T.tubeZero);
    fillY.set(clamped);
    scheduleOnRN(emit, clamped);
  };

  const pan = usePanGesture({
    activeOffsetY: [-4, 4],
    onUpdate: (e) => {
      'worklet';
      moveTo(e.y);
    },
  });
  const tap = useTapGesture({
    onActivate: (e) => {
      'worklet';
      moveTo(e.y);
    },
  });
  const gesture = useCompetingGestures(pan, tap);

  const emptyStyle = useAnimatedStyle(() => ({ height: Math.max(0, fillY.get() - T.tubeTop) }));
  const fillStyle = useAnimatedStyle(() => ({ top: fillY.get(), height: T.fillBottom - fillY.get() }));
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: fillY.get() - T.knob / 2 }] }));

  const nudge = (d: 1 | -1) => {
    const next = Math.min(max, Math.max(min, value + d));
    if (next !== value) onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.thermometer}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Temperature"
          accessibilityValue={{ text: `${value} degrees ${unit === 'C' ? 'Celsius' : unit}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        >
          <Image source={require('../../../../assets/quiz/thermometer-base.svg')} style={StyleSheet.absoluteFill} accessible={false} />
          <Animated.View style={[styles.tube, styles.empty, emptyStyle]} />
          <Animated.View style={[styles.tube, styles.fill, fillStyle]} />
          <Image source={require('../../../../assets/quiz/thermometer-ticks.svg')} style={StyleSheet.absoluteFill} accessible={false} />
          <Animated.View style={[styles.knob, knobStyle]} />
        </View>
      </GestureDetector>

      {/* Figma: "20", a small ring for the degree sign, "C" (H1 Extra Bold 32). */}
      <View style={styles.reading} accessible={false} importantForAccessibility="no-hide-descendants">
        <Text variant="display32" weight="extrabold" color="black">
          {value}
        </Text>
        <View style={styles.degree} />
        <Text variant="display32" weight="extrabold" color="black">
          {unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  thermometer: {
    width: T.width,
    height: T.height,
  },
  tube: {
    position: 'absolute',
    left: T.tubeX,
    width: T.tubeWidth,
  },
  empty: {
    top: T.tubeTop,
    backgroundColor: colors.thermometerEmpty,
  },
  fill: {
    backgroundColor: colors.thermometerFill,
  },
  // Figma: 28pt white knob with a soft shadow, centred on the tube at the mercury's top.
  knob: {
    position: 'absolute',
    top: 0,
    left: T.tubeX + T.tubeWidth / 2 - T.knob / 2,
    width: T.knob,
    height: T.knob,
    borderRadius: T.knob / 2,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  // Figma: reading 60pt below the thermometer (748 vs 688).
  reading: {
    marginTop: 60,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 2,
  },
  degree: {
    width: 9,
    height: 9,
    marginTop: 0,
    borderRadius: 4.5,
    borderWidth: 1,
    borderColor: colors.black,
  },
});
