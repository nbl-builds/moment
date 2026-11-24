import { colors, spacing } from '@moment/shared';
import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, useNativeGesture, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

/** Sheet corner radius (Figma: 20 on the "Login or sign up" sheet). */
const SHEET_RADIUS = 20;
/** Gap between the status bar and the tallest sheet (Figma: sheet top at 52 under a 44pt status bar). */
const TOP_GAP = spacing.sm;
/** Drag further than this share of the sheet's height, or flick down fast, to close. */
const CLOSE_DISTANCE_RATIO = 0.25;
const CLOSE_VELOCITY = 1000;

const OPEN_TIMING = { duration: 300, easing: Easing.out(Easing.cubic) };
const CLOSE_TIMING = { duration: 250, easing: Easing.in(Easing.cubic) };

interface BottomSheetProps {
  visible: boolean;
  /** Called when the user swipes the sheet down or presses Android back. Set `visible` to false in response. */
  onRequestClose: () => void;
  children: ReactNode;
  accessibilityLabel?: string;
  /** Sheet colour; the pickers use the off-white page colour (Figma 22:1590). */
  backgroundColor?: string;
  /** Minimum height as a share of the window, for sheets with short content. */
  minHeightRatio?: number;
}

/**
 * Modal bottom sheet over a dimmed backdrop. Rounded top corners, slides up,
 * closes on a downward swipe or Android back. Content scrolls when it is
 * taller than the screen; dragging down from the top of the content closes it.
 */
export function BottomSheet({
  visible,
  onRequestClose,
  children,
  accessibilityLabel,
  backgroundColor,
  minHeightRatio,
}: BottomSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);

  const translateY = useSharedValue(windowHeight);
  const sheetHeight = useSharedValue(windowHeight);
  const scrollOffset = useSharedValue(0);
  /** Pan translation at the moment the content was scrolled back to the top. */
  const dragStart = useSharedValue(0);

  // Mount as soon as it should show (state update during render, not in an effect).
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      translateY.set(withTiming(0, OPEN_TIMING));
    } else if (mounted) {
      translateY.set(
        withTiming(sheetHeight.get(), CLOSE_TIMING, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, mounted, translateY, sheetHeight]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onRequestClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onRequestClose]);

  const scrollGesture = useNativeGesture({});
  const panGesture = usePanGesture({
    activeOffsetY: 10,
    failOffsetX: [-20, 20],
    simultaneousWith: scrollGesture,
    onActivate: () => {
      'worklet';
      dragStart.set(0);
    },
    onUpdate: (e) => {
      'worklet';
      // While the content is scrolled, let it scroll; start moving the sheet once it reaches the top.
      if (scrollOffset.value > 0) {
        dragStart.set(e.translationY);
        return;
      }
      translateY.set(Math.max(0, e.translationY - dragStart.get()));
    },
    onDeactivate: (e) => {
      'worklet';
      if (translateY.value === 0) return;
      const shouldClose = translateY.value > sheetHeight.value * CLOSE_DISTANCE_RATIO || e.velocityY > CLOSE_VELOCITY;
      if (shouldClose) scheduleOnRN(onRequestClose);
      else translateY.set(withSpring(0, { damping: 20, stiffness: 200 }));
    },
  });

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollOffset.set(e.contentOffset.y);
  });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, sheetHeight.value], [1, 0], 'clamp'),
  }));

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="none" />
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <View style={[styles.column, { paddingTop: insets.top + TOP_GAP }]} pointerEvents="box-none">
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                styles.sheet,
                backgroundColor !== undefined && { backgroundColor },
                minHeightRatio !== undefined && { minHeight: windowHeight * minHeightRatio },
                sheetStyle,
              ]}
              onLayout={(e) => {
                sheetHeight.set(e.nativeEvent.layout.height);
              }}
              accessibilityLabel={accessibilityLabel}
            >
              <GestureDetector gesture={scrollGesture}>
                <Animated.ScrollView
                  onScroll={onScroll}
                  scrollEventThrottle={16}
                  bounces={false}
                  overScrollMode="never"
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {children}
                </Animated.ScrollView>
              </GestureDetector>
            </Animated.View>
          </GestureDetector>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.scrim,
  },
  column: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    flexShrink: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    overflow: 'hidden',
  },
});
