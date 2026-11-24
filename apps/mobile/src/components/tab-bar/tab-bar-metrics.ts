/**
 * Floating tab bar geometry (not in Figma: replaces its bottom bar). Expanded is
 * a full-width pill with labels; compact is narrower and shorter, icons only.
 * Every tap target stays at least 44pt.
 */
export const TAB_BAR = {
  expanded: {
    height: 68,
    sideInset: 16,
    /** Explore circle and how far it rises above the pill. */
    exploreSize: 58,
    exploreRaise: 16,
  },
  compact: {
    height: 52,
    sideInset: 56,
    exploreSize: 44,
    exploreRaise: 4,
  },
  radius: 34,
  iconSize: 24,
  /** Space between the last scroll item and the bar. */
  contentGap: 24,
  /** Distance from the screen bottom: just above the home indicator. */
  bottomOffset: (safeBottom: number) => (safeBottom > 0 ? safeBottom - 6 : 12),
  minTapTarget: 44,
} as const;
