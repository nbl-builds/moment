import { colors } from '@moment/shared';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { interpolate, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Icon, Text } from '@/components/ui';

/** Collapsed strip above the home indicator (48:2341: 87pt visible, r30 top). */
export const STRIP_HEIGHT = 58;
const SPRING = { damping: 22, stiffness: 220, mass: 0.8 };

interface ResultsPanelProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** Distance the list travels: from fully hidden to just under the header. */
  travel: number;
  bottomInset: number;
  /** 0 = map, 1 = list; drives the map controls fading out too. */
  progress: SharedValue<number>;
  children: ReactNode;
}

/**
 * Explore's bottom panel (48:2341 collapsed, 52:9860 dragged up): a strip
 * with a chevron that you drag (or tap) to slide the result list up over the
 * map, and down again.
 */
export function ResultsPanel({ expanded, onExpandedChange, travel, bottomInset, progress, children }: ResultsPanelProps) {
  const reduceMotion = useReducedMotion();
  const start = useSharedValue(0);

  useEffect(() => {
    const target = expanded ? 1 : 0;
    progress.set(reduceMotion ? target : withSpring(target, { ...SPRING, reduceMotion: ReduceMotion.System }));
  }, [expanded, progress, reduceMotion]);

  const pan = usePanGesture({
    activeOffsetY: [-8, 8],
    onActivate: () => {
      'worklet';
      start.set(progress.value);
    },
    onUpdate: (e) => {
      'worklet';
      progress.set(Math.min(1, Math.max(0, start.value - e.translationY / travel)));
    },
    onDeactivate: (e) => {
      'worklet';
      // The strip sits at the screen's bottom edge, so short drags and flicks count.
      const wasOpen = start.value > 0.5;
      const open =
        Math.abs(e.velocityY) > 400 ? e.velocityY < 0 : wasOpen ? e.translationY < 24 : e.translationY < -24;
      progress.set(withSpring(open ? 1 : 0, { ...SPRING, reduceMotion: ReduceMotion.System }));
      scheduleOnRN(onExpandedChange, open);
    },
  });

  const listStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * travel }] }));
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }] }));

  return (
    <>
      <Animated.View style={[styles.list, { top: 0, height: travel, pointerEvents: expanded ? 'auto' : 'none' }, listStyle]}>
        {children}
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Pressable
          onPress={() => onExpandedChange(!expanded)}
          style={[styles.strip, { height: STRIP_HEIGHT + bottomInset, paddingBottom: bottomInset }]}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show the map' : 'Show all results as a list'}
          accessibilityHint="Swipe up or down, or tap"
        >
          <Animated.View style={chevronStyle}>
            <Icon name="handle-up" size={28} />
          </Animated.View>
          <Text variant="subText14" weight="semibold" color="secondary" style={styles.copy}>
            {expanded ? 'Swipe down to see map' : 'Swipe up to see all'}
          </Text>
        </Pressable>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.backgroundMuted,
  },
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: 8,
    backgroundColor: colors.backgroundMuted,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderColor: colors.divider,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
  copy: {
    marginTop: 8,
  },
});
