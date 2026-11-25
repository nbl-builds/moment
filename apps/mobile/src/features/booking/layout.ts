// Booking Flow measurements from Figma (428 x 926 frames): Confirm
// Reservation 47:5143, Select dates 47:4198 / 47:4348, and the sheets
// 47:3717 (date), 47:3864 (time), 47:4596 (guests), 47:4735 (notes),
// 47:4827 (payment), 47:4945 (coupon), 47:5045 (success).

export const BOOK = {
  inset: 20,
  /** Back chevron at y60 under the 44pt status bar. */
  backTop: 16,
  /** Title at y118: 30 below the 28pt back button. */
  titleTop: 30,
  /** Title -> header divider (y165). */
  dividerTop: 15,
  /** Divider -> first card / tab chips. */
  afterDivider: 20,
  card: { radius: 15, padding: 15, gap: 16 },
  /** Section title (Bold 18, 27 tall) -> first line. */
  titleToRow: 12,
  /** Line items repeat every 37pt (Medium 15, 22.5 tall). */
  rowPitch: 37,
  /** Last line -> next section title. */
  sectionGap: 28,
  business: { height: 120, logo: 100, logoRadius: 20, textLeft: 116 },
  price: { rowPitch: 38, total: 37 },
  promo: { height: 60, radius: 12, iconLeft: 15, textLeft: 49 },
  /** Pinned Confirm & Pay / Save buttons sit 16 above the safe area (y821 in the frame). */
  buttonGap: 16,
  slot: { avatar: 40, button: 60, buttonRadius: 12, guestButton: 32 },
  chip: { padX: 14, padY: 8, radius: 12, gap: 16 },
  sheet: {
    /** Sheet tops in the 926 frame, for the sheet heights. */
    top: { date: 502, time: 361, guests: 361, notes: 511, payment: 575, coupon: 405, success: 472 },
    headerTop: 20,
    close: 28,
    /** Rows in the Payment Method sheet (47:4827). */
    paymentRow: { height: 60, radius: 15, gap: 19 },
    couponRow: { height: 60, gap: 16 },
    timeCard: { height: 70, gap: 16 },
    guestRow: 77,
    stepper: 32,
    calendar: { rowPitch: 48, pill: { padX: 10, padY: 8, radius: 20 } },
  },
  frameHeight: 926,
} as const;
