// Home measurements from Figma "Dashboard" (13:1487) and "Dashboard Long"
// (17:1027), 428 x 926 frames. Vertical gaps are between elements.

export const HOME = {
  inset: 20,
  /** Status bar -> search bar. */
  headerTop: 6,
  searchHeight: 50,
  /** Search bar -> heart button gap; the heart is a 44pt white square. */
  searchToHeart: 16,
  heartButton: 44,
  /** Below the pinned header before the first item. */
  headerBottom: 20,

  promo: { width: 344, height: 130, gap: 20, radius: 15 },
  promoToQuiz: 20,
  quiz: { height: 60, radius: 12 },
  quizToSection: 20,

  sectionHeaderHeight: 28,
  arrowSize: 28,
  arrowRightInset: 19,
  /** Section header top -> its first card. */
  headerToContent: 16,
  /** Recently viewed has no arrow and a tighter gap. */
  headerToContentNoArrow: 12,
  /** Last item of a section -> next section header. */
  sectionGap: 20,

  card: {
    width: 286,
    gap: 20,
    radius: 15,
    padding: 10,
    imageRadius: 12,
    /** Popular / Recently viewed: 421pt card with a 285pt photo. */
    tall: { height: 421, image: 285, titleGap: 10, titleLines: 2, footerBottom: 8 },
    /** Just for you: 332pt card with a 198pt photo. */
    short: { height: 332, image: 198, titleGap: 12, titleLines: 2, footerBottom: 6 },
    /** Search Results (22:2205): full width, 392pt, one-line title. */
    wide: { height: 392, image: 285, titleGap: 10, titleLines: 1, footerBottom: 3 },
    chip: { width: 50, height: 24, radius: 6, inset: 14 },
    avatar: 40,
  },
  host: { tile: 90, gap: 20, chipOverlap: 12, nameGap: 16 },
  chip: { gap: 16, radius: 12, paddingH: 20, paddingV: 8 },
  tile: { width: 160, height: 202, radius: 15, gap: 20, labelBottom: 12 },
  missing: { height: 188, radius: 15 },
} as const;

/** Snap step for a horizontal rail of items `width` wide with `gap` between them. */
export const snapStep = (width: number, gap: number) => width + gap;
