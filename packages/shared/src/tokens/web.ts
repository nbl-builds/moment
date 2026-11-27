import { palette } from './colors';
import { fontWeight } from './typography';

/**
 * Web tokens for apps/web (business portal first), from the Moment Business App
 * Figma file (Colors 4:139, Typography 111:146, Buttons 127:886 and the auth
 * frames on "Business Web App Design"). Shared colour roles live in `colors`;
 * these are the web-only additions. All of them are emitted as CSS variables by
 * `cssVariables` (`--color-*`, `--text-*`, `--web-*`).
 */
export const webColors = {
  /** Secondary text on the portal (S Tint 2). */
  textMuted: palette.nearBlackTint2,
  /** Web-Field fill, social buttons, unselected tiles (S Tint 6). */
  field: palette.nearBlackTint6,
  /** Placeholder dots in empty OTP cells (S Tint 5). */
  otpDot: palette.nearBlackTint5,
  /** Disabled button: fill S Tint 5, label S Tint 2 (Figma "Continue" 472:2009). */
  buttonDisabled: palette.nearBlackTint5,
  onButtonDisabled: palette.nearBlackTint2,
  /** "or" divider lines (Black Tint 6). */
  hairline: palette.grey82,
  /** Wrong code: OTP cell fill and border (495:2167). */
  otpErrorSurface: palette.redTint,
  otpErrorBorder: palette.coralShade,
  /** Padlock badge on "Enter Verification Code" (P Tint 6, icon P Shade 2). */
  badgeSurface: palette.limeTint6,
  badgeIcon: palette.limeShade2,
  /** Category and type icons (Third Color). */
  accent: palette.orange,
  /** Under-review banner on the dashboard (Third tints). */
  noticeSurface: palette.orangeTint6,
  noticeBorder: palette.orangeTint4,
  noticeText: palette.orangeShade3,
  /** Toasts. */
  toast: palette.nearBlack,
  onToast: palette.white,

  // Portal (Dashboard, Calendar, Inbox, Listings, Insights, Reviews)
  /** Grey page behind the white cards. */
  page: palette.offWhite,
  /** Inactive nav pills and secondary labels (S Tint 2); active pill is Secondary. */
  navInactive: palette.nearBlackTint2,
  /** Reservations panel behind the rows. */
  panel: palette.grey94Warm,
  /** Calendar reservation rows, unread inbox rows. */
  rowMuted: palette.grey98,
  /** Addresses and times under rows (S Tint 3). */
  textSubtle: palette.nearBlackTint3,
  /** "Complete your profile" and its shield. */
  warning: palette.coralShade,
  /** Card and menu shadow colour (Figma: 0 22 133 rgba(0,0,0,0.08)). */
  shadow: 'rgba(0, 0, 0, 0.08)',
  /** Suggestion chips and outgoing bubbles (0 4 33 rgba(0,0,0,0.1)). */
  chip: palette.offWhite99,
  chipShadow: 'rgba(0, 0, 0, 0.1)',
  /** "Suggestions" label (P Shade 2). */
  suggestionLabel: palette.limeShade2,
  /** Incoming chat bubble and composer buttons (Black Tint 7). */
  bubbleIn: palette.grey95,
  composerText: palette.blackTint2,
  timestamp: palette.blackTint1,
  /** Inbox search placeholder and icon (Black Tint 4). */
  searchText: palette.blackTint4,
  /** Unread count badges. */
  unreadBadge: palette.pureBlack,
  /** Charts. */
  chartAxis: palette.grey64,
  chartGuide: palette.grey46,
  chartBar: palette.nearBlack,
  chartRevenue: palette.insightYellow,
  chartViews: palette.insightOrange,
  chartTooltip: palette.offWhite99,
  chartTooltipShadow: 'rgba(108, 126, 147, 0.15)',
  chartValue: palette.insightOrange,
  positive: palette.insightGreen,
  negative: palette.coralShade,
  donut1: palette.limeShade5,
  donut2: palette.insightOrange,
  donut3: palette.insightYellowDeep,
  donut4: palette.grey28,
  donut5: palette.nearBlackTint3,
  donut6: palette.limeShade2,
  /** Insights stat cards: number and icon tile per status. */
  statIncoming: palette.orange,
  statIncomingTint: palette.orangeTint6,
  statOngoing: palette.statBlue,
  statOngoingTint: palette.statBlueTint,
  statPending: palette.statPurple,
  statPendingTint: palette.statPurpleTint,
  statCancelled: palette.statRed,
  statCancelledTint: palette.statRedTint,
  statCompleted: palette.statGreen,
  statCompletedTint: palette.statGreenTint,
  /** Rating stars (filled / empty) and rating bars. */
  star: palette.starGold,
  starEmpty: palette.nearBlackTint4,
  ratingTrack: palette.nearBlackTint6,
  /** Reservation status pills in the side panel. */
  statusPending: palette.orangeTint6,
  onStatusPending: palette.orangeShade3,
  statusConfirmed: palette.limeTint6,
  onStatusConfirmed: palette.limeShade4,
  statusCancelled: palette.redTint,
  onStatusCancelled: palette.coralShade,
  statusDone: palette.nearBlackTint6,
  onStatusDone: palette.nearBlackTint1,
  /** Scrim behind the side panel and sheets. */
  scrim: 'rgba(19, 22, 23, 0.4)',
} as const;

/**
 * Web type scale. Figma Typography page: H1 76 Black, H2 61, H3 49, H4 39 Bold;
 * body XX-Large 25, X-Large 20, Large 18, Regular 16, Small 14, X-Small 12, all
 * line height 1.5. "Headings/H5" (32 Bold, 1% tracking) is the auth page title.
 * "Web-text/Body/Regular" (16 / 1.4 / 1%) is field text and social buttons.
 */
export const webTextStyles = {
  // Figma says Black (900); Manrope stops at ExtraBold (800).
  webH1: { fontSize: 76, lineHeight: 1.5, fontWeight: fontWeight.extrabold, letterSpacing: 0 },
  webH2: { fontSize: 61, lineHeight: 1.5, fontWeight: fontWeight.bold, letterSpacing: 0 },
  webH3: { fontSize: 49, lineHeight: 1.5, fontWeight: fontWeight.bold, letterSpacing: 0 },
  webH4: { fontSize: 39, lineHeight: 1.5, fontWeight: fontWeight.bold, letterSpacing: 0 },
  webH5: { fontSize: 32, lineHeight: 1.5, fontWeight: fontWeight.bold, letterSpacing: 0.32 },
  /** "Create New Listing": ExtraBold 40 / 1.4 / 1%. */
  webTitle40: { fontSize: 40, lineHeight: 1.4, fontWeight: fontWeight.extrabold, letterSpacing: 0.4 },
  webBody25: { fontSize: 25, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  webBody20: { fontSize: 20, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  /** "Didn't get a code? Send again" (20 / 1.4 / 1%). */
  webBody20Tight: { fontSize: 20, lineHeight: 1.4, fontWeight: fontWeight.regular, letterSpacing: 0.2 },
  webBody18: { fontSize: 18, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  webBody16: { fontSize: 16, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  webField16: { fontSize: 16, lineHeight: 1.4, fontWeight: fontWeight.regular, letterSpacing: 0.16 },
  webBody14: { fontSize: 14, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  /** Buttons on the Buttons page use 1.2 line height (Contact Us, Get Started). */
  webButton14: { fontSize: 14, lineHeight: 1.2, fontWeight: fontWeight.semibold, letterSpacing: 0 },
  webButton16: { fontSize: 16, lineHeight: 1.2, fontWeight: fontWeight.semibold, letterSpacing: 0 },
  webBody12: { fontSize: 12, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  webBody10: { fontSize: 10, lineHeight: 1.5, fontWeight: fontWeight.regular, letterSpacing: 0 },
  /** Chart axis labels (11 / 1.35). */
  webAxis11: { fontSize: 11, lineHeight: 1.35, fontWeight: fontWeight.regular, letterSpacing: 0 },
  /** Portal nav pills, "Profile" menu items (14 / 1.4 / 1%). */
  webNav14: { fontSize: 14, lineHeight: 1.4, fontWeight: fontWeight.medium, letterSpacing: 0.14 },
  /** Card titles on the right of the dashboard (16 / 1.4 / 1%). */
  webCardTitle16: { fontSize: 16, lineHeight: 1.4, fontWeight: fontWeight.bold, letterSpacing: 0.16 },
  /** "Your reservations" (ExtraBold 30 / 1.5 / 1%). */
  webSection30: { fontSize: 30, lineHeight: 1.5, fontWeight: fontWeight.extrabold, letterSpacing: 0.3 },
  /** Wallet and rating figures (ExtraBold 36 / 1.4 / 1%). */
  webFigure36: { fontSize: 36, lineHeight: 1.4, fontWeight: fontWeight.extrabold, letterSpacing: 0.36 },
  /** Calendar weekday labels (Bold 12, caps, 0.86 tracking). */
  webWeekday12: { fontSize: 12, lineHeight: 1.2, fontWeight: fontWeight.bold, letterSpacing: 0.857 },
} as const;

export type WebTextStyleToken = keyof typeof webTextStyles;

/** Sizes in px. Figma frames are 1440 x 1024. */
export const webLayout = {
  frameWidth: 1440,
  frameHeight: 1024,
  /** Auth split screen: photo column 710 of 1440. */
  authPhotoWidth: 710,
  /** Below this width the photo is hidden and the form is centred. */
  authCollapse: 1024,
  /** Form column: 480 wide (fields, buttons), header inset 80 / 30. */
  authFormWidth: 480,
  authWideFormWidth: 522,
  authTileGridWidth: 544,
  authHeaderInsetX: 80,
  authHeaderInsetY: 30,
  /** Phone-width gutter. */
  gutter: 16,
  /** Web-Field: 60 tall, 18 padding, 10 radius; label 10 above; 24 between fields. */
  fieldHeight: 60,
  fieldLabelGap: 10,
  fieldStackGap: 24,
  fieldPaddingX: 18,
  fieldRadius: 10,
  /** Full-width form buttons are 58 tall with a 10 radius. */
  formButtonHeight: 58,
  /** OTP: six 72 cells, 10 apart, radius 15; empty dot 18. */
  otpCell: 72,
  otpGap: 10,
  otpRadius: 15,
  otpDot: 18,
  /** Padlock badge: 30 padding, 30 radius, 80 icon. */
  badgePadding: 30,
  badgeRadius: 30,
  badgeIcon: 80,
  /** Type cards (Tell us about yourself) and category tiles. */
  cardRadius: 15,
  typeCardHeight: 120,
  tileWidth: 262,
  tileHeight: 204,
  tileGap: 20,
  tileIcon: 60,
  socialIcon: 28,
  icon: 24,
  /** Text column widths measured on the frames. */
  introWidth: 409,
  typeTextWidth: 236,
  /** Header logo offset (logo top 37 vs Contact Us 30). */
  logoTop: 37,
  /** Placeholder pages (dashboard, terms). */
  contentWidth: 960,
  readingWidth: 760,
  /** Compact type-card icon on phones. */
  compactIcon: 44,

  // Portal shell and pages (Figma 1440 frames)
  topBarHeight: 100,
  /** Content runs from x 80 to x 1360. */
  contentWidth1280: 1280,
  topIconButton: 48,
  avatarButtonWidth: 96,
  avatarSize: 40,
  menuWidth: 221,
  menuItemHeight: 53,
  heroPhoto: 122,
  heroHeight: 154,
  sideCardHeight: 67,
  dashboardRightColumn: 413,
  reservationRowHeight: 80,
  rowPhoto: 60,
  inboxListWidth: 433,
  inboxRowHeight: 100,
  inboxPhoto: 40,
  threadPhoto: 50,
  chatAvatar: 35,
  bubbleMaxWidth: 340,
  composerButton: 40,
  listingCardHeight: 360,
  listingPhotoHeight: 197,
  editButton: 42,
  statCardHeight: 163,
  statIcon: 50,
  chartCardHeight: 332,
  calendarCell: 52,
  calendarSelected: 38,
  panelWidth: 480,
  ratingBarHeight: 10,
  reviewPhotoWidth: 56,
  reviewPhotoHeight: 64,
  /** Menu / card shadow blur (Figma 0 22 133) and chip / bubble blur (0 4 33). */
  shadowBlur: 133,
  chipShadowBlur: 33,
  lightboxWidth: 1100,
  inboxMinHeight: 600,
  compactMinHeight: 520,
  tileCardHeight: 150,
  emptyMinHeight: 490,
  emptyTextWidth: 220,
  phonePanelMinHeight: 360,
  phoneEmptyMinHeight: 340,
  /** Narrowest listing card before the grid wraps. */
  cardMinColumn: 340,
  ratingColumn: 136,
  accentBorder: 3,
  /** Listing Details (Figma 629:7360): left column 847 (cover 847 x 447), right column 413 from x 967. */
  /** Customer preview frame (mobile Figma frames are 428 wide). */
  mobileFrame: 428,
  detailLeft: 847,
  detailRight: 413,
  detailCoverHeight: 447,
  detailThumb: 96,
  mapTile: 140,
  switchWidth: 44,
  switchHeight: 24,

  // Create New Listing wizard (Figma 614:2157 .. 616:4291)
  /** Title at y 170 (40 below the top bar edge 100 + 70), cards from y 266. */
  wizardTitleTop: 70,
  wizardCardsTop: 40,
  /** Sidebar card 305 wide (x 80), main card 955 (x 405): 20 apart. */
  wizardSidebarWidth: 305,
  wizardMainWidth: 955,
  wizardColumnGap: 20,
  wizardCardMinHeight: 674,
  /** Sidebar rows: 265 x 50, 8 apart, 20 inset; text 16 in; state icon 16 from the right. */
  wizardRowHeight: 50,
  wizardRowGap: 8,
  wizardRowInset: 20,
  wizardRowTextInset: 16,
  wizardStateInset: 16,
  wizardDot: 8,
  wizardCheck: 14,
  /** Form column 521 wide, centred in the main card, 80 from its top. */
  wizardFormWidth: 521,
  wizardFormTop: 80,
  /** Next: 152 x 48; Back 30 to its left. */
  wizardNextWidth: 152,
  wizardActionsGap: 30,
  /** Progress bar: 5 tall, 16 under the main card; label 13 under the bar. */
  wizardProgressHeight: 5,
  wizardProgressGap: 16,
  wizardProgressLabelGap: 13,
  /** Title box 140 tall; description box 236; drop zone 266 (2px dashed). */
  wizardTitleBox: 140,
  wizardDescriptionBox: 236,
  wizardDropZone: 266,
  wizardDropIcon: 50,
  /** Photo review grid: 262 x 319 tiles, 18 apart. */
  wizardPhotoHeight: 319,
  /** Requirement chips: 117 x 40, radius 10, 11 apart. */
  wizardChipWidth: 117,
  wizardChipHeight: 40,
  wizardChipGap: 11,
  /** Map for the meeting pin. */
  wizardMapHeight: 280,
  /** Phone preview on Review & submit. */
  wizardPreviewWidth: 300,

  // Profile (629:7232) and Account Settings (131:676, 515:3218 / 3352 / 3295)
  /** Cover 1280 x 250 from y 150; avatar 200 (2px white border) at x 136, y 294. */
  profileCoverHeight: 250,
  profileAvatar: 200,
  profileAvatarInset: 56,
  profileAvatarOverlap: 106,
  profileNameGap: 43,
  /** About me card 466 wide; right column from x 622; cards 100 tall, 20 apart. */
  profileAboutWidth: 466,
  profileRowCardHeight: 100,
  profileIcon: 50,
  /** Settings: page title at y 170, cards from y 258; rows 120 tall with 30 insets; icons 42. */
  settingsTop: 70,
  settingsCardsTop: 40,
  settingsInset: 30,
  settingsRowHeight: 120,
  settingsIcon: 42,
  settingsIconGap: 29,
} as const;

/**
 * Gaps measured on the Business App auth frames, in px, emitted as
 * `--web-space-<n>` (e.g. 40 between a heading block and the first field,
 * 50 between sections, 60 above a primary button).
 */
export const webSpace = [2, 4, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 20, 22, 24, 25, 30, 32, 38, 40, 50, 60, 80] as const;

/** Portal radii: cards 10 / 15, inbox bubbles 30 with a 5 corner, pills 50. */
export const webRadii = { card: 10, cardLarge: 15, photo: 6, bubble: 30, bubbleTail: 5, pill: 50 } as const;

/**
 * Buttons page (127:886): Small 30, Medium 40, Large 48 tall; radius 10; label
 * SemiBold 14 / 14 / 16 with 8 / 8 / 12 inner padding plus 12 / 12 / 14 outer.
 */
export const webButtonSizes = {
  small: { height: 30, paddingX: 16, radius: 8, textStyle: 'webButton14' },
  medium: { height: 40, paddingX: 20, radius: 10, textStyle: 'webButton14' },
  large: { height: 48, paddingX: 26, radius: 10, textStyle: 'webButton16' },
} as const;
