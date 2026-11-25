// Booking Status measurements from Figma (428 x 926 frames): Bookings 52:8565,
// All Bookings 52:9094, Filter 47:6282, Cart 52:8991, Reservation 47:6385,
// Chat 47:5940 / 52:9442.

export const BOOKINGS = {
  inset: 20,
  /** Status bar (44) -> title at y109; the back chevron sits at y60 on pushed screens. */
  titleTop: 65,
  backTop: 16,
  /** Back chevron (28) -> title. */
  backToTitle: 21,
  /** Title (36 tall) -> divider at y159. */
  dividerTop: 14,
  /** Divider -> first card: 26 on Bookings, 20 on All Bookings and Cart. */
  listTop: 25,
  listTopPushed: 19,
  emptyTop: 180,
  headerIconGap: 20,
  card: { height: 120, radius: 15, gap: 16 },
  cartGap: 20,
  filterRow: { height: 60, radius: 15, gap: 16 },
} as const;

export const RESERVATION = {
  photo: 454,
  close: 44,
  /** White sections stacked 4pt apart, 20pt (title) / 40pt (content) insets. */
  sectionGap: 4,
  padTop: 30,
  chat: { size: 50, radius: 12, icon: 30 },
  infoIcon: 24,
} as const;

export const CHAT = {
  inset: 20,
  avatar: 50,
  avatarRadius: 14,
  dot: 10,
  headerButton: 44,
  bubbleAvatar: 35,
  bubbleMax: 275,
  composer: { height: 60, radius: 30, plus: 40, send: { width: 60, height: 42, radius: 20 } },
  option: 42,
} as const;
