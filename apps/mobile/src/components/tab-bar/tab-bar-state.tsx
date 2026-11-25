import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ReduceMotion,
  useAnimatedScrollHandler,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { TAB_BAR } from './tab-bar-metrics';

// Shared state of the floating tab bar. `collapse` runs from 0 (expanded) to 1
// (compact) and lives on the UI thread: scroll handlers write it, the bar reads it.

interface TabBarState {
  collapse: SharedValue<number>;
  /** Expand (0) or compact (1), animated unless Reduce Motion is on. */
  setCollapsed: (collapsed: boolean) => void;
  /** 1 while a tab screen shows a bottom sheet: the bar slides away so it doesn't cover the sheet. */
  hidden: SharedValue<number>;
  setHidden: (hidden: boolean) => void;
}

const TabBarContext = createContext<TabBarState | null>(null);

const DURATION_MS = 220;
/** Points of scroll in one direction before the bar reacts (ignores jitter). */
const SCROLL_THRESHOLD = 6;
/** Near the top the bar is always expanded. */
const TOP_ZONE = 24;

export function TabBarProvider({ children }: { children: ReactNode }) {
  const collapse = useSharedValue(0);
  const hidden = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const value = useMemo<TabBarState>(
    () => ({
      collapse,
      hidden,
      setHidden: (value) => {
        const target = value ? 1 : 0;
        hidden.set(reduceMotion ? target : withTiming(target, { duration: DURATION_MS, reduceMotion: ReduceMotion.System }));
      },
      setCollapsed: (collapsed) => {
        const target = collapsed ? 1 : 0;
        collapse.set(
          reduceMotion
            ? target
            : withTiming(target, { duration: DURATION_MS, reduceMotion: ReduceMotion.System }),
        );
      },
    }),
    [collapse, hidden, reduceMotion],
  );

  return <TabBarContext.Provider value={value}>{children}</TabBarContext.Provider>;
}

export function useTabBar(): TabBarState {
  const ctx = useContext(TabBarContext);
  if (!ctx) throw new Error('useTabBar must be used inside <TabBarProvider>');
  return ctx;
}

/**
 * Scroll handler for a tab screen's scroll view: scrolling down compacts the
 * bar, scrolling up or reaching the top expands it. Runs on the UI thread.
 *
 *   const onScroll = useCollapsibleTabBarScroll();
 *   <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} />
 */
export function useCollapsibleTabBarScroll() {
  const { collapse } = useTabBar();
  const reduceMotion = useReducedMotion();
  const lastY = useSharedValue(0);

  return useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      const dy = y - lastY.get();
      let target = -1;
      if (y <= TOP_ZONE) target = 0;
      else if (dy > SCROLL_THRESHOLD) target = 1;
      else if (dy < -SCROLL_THRESHOLD) target = 0;
      if (Math.abs(dy) > SCROLL_THRESHOLD || y <= TOP_ZONE) lastY.set(y);
      if (target === -1) return;
      // Only start an animation when the target changes.
      const current = collapse.get();
      if ((target === 1 && current < 0.999) || (target === 0 && current > 0.001)) {
        collapse.set(reduceMotion ? target : withTiming(target, { duration: DURATION_MS }));
      }
    },
  });
}

/**
 * Bottom padding for a tab screen's scroll content so the last item clears the
 * expanded bar (the bar never hides, it only shrinks).
 */
export function useTabBarContentInset(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR.bottomOffset(insets.bottom) + TAB_BAR.expanded.height + TAB_BAR.contentGap;
}

/** Hides the floating bar while `sheetOpen` is true (tab screens that show bottom sheets). */
export function useHideTabBarWhile(sheetOpen: boolean) {
  const { setHidden } = useTabBar();
  useEffect(() => {
    setHidden(sheetOpen);
    return () => setHidden(false);
  }, [sheetOpen, setHidden]);
}
