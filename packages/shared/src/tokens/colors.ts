/**
 * Moment colour palette, from the Figma design system.
 * Never hardcode colours in the apps: import from here.
 */
export const palette = {
  lime: '#CFFF58',
  limeTint1: '#D6FF70', // Figma: Primary Color / P Tint 1
  limeShade1: '#B2D84B', // Figma: Primary Color / P Shade 1
  limeShade2: '#92B23C', // Figma: Primary Color / P Shade 2 (picked seat, Adventure Quiz 20:2367)
  limeShade4: '#52661E', // Figma: Primary Color / P Shade 4
  limeTint6: '#F8FFE5', // Figma: Primary Color / P Tint 6
  limeTint2: '#DDFF88', // Figma: Primary Color / P Tint 2
  limeTint3: '#E4FFA0', // Figma: Primary Color / P Tint 3
  limeTint4: '#EBFFB8', // Figma: Primary Color / P Tint 4
  limeTint5: '#F2FFD0', // Figma: Primary Color / P Tint 5
  nearBlack: '#131617',
  nearBlackTint1: '#383B3C', // Figma: Secondary Color / S Tint 1
  nearBlackTint2: '#5D6061', // Figma: Secondary Color / S Tint 2
  nearBlackTint3: '#828586', // Figma: Secondary Color / S Tint 3
  nearBlackTint4: '#A7AAAB', // Figma: Secondary Color / S Tint 4
  nearBlackTint5: '#CCCFD0', // Figma: Secondary Color / S Tint 5
  nearBlackTint6: '#F1F3F4', // Figma: Secondary Color / S Tint 6
  orange: '#FE8A29', // Figma: Third Color / Third Color
  // Third Color tints and shades (Business App file, Colors page 4:139)
  orangeTint1: '#FE9B49',
  orangeTint2: '#FEAC69',
  orangeTint3: '#FEBD89',
  orangeTint4: '#FECEA9',
  orangeTint5: '#FEDFC9',
  orangeTint6: '#FFF1E6',
  orangeShade1: '#D77423',
  orangeShade2: '#B15F1C',
  orangeShade3: '#8B4A15',
  orangeShade4: '#65350E',
  orangeShade5: '#3F2007',
  orangeShade6: '#190B00',
  // Business App file, portal screens (Dashboard 209:929, Inbox 127:507, Insights 512:2143)
  grey94Warm: '#F0F0F0', // reservations panel
  grey98: '#F9F9F9', // calendar rows, unread inbox rows
  offWhite99: '#FDFDFD', // suggestion chips, chart tooltips ("BG 10%")
  grey64: '#A3A3A3', // chart axis labels ("Black 40%")
  grey46: '#767676', // chart guide line ("Black 60%")
  grey28: '#484848', // donut slice ("Black 80%")
  insightOrange: '#FF6500', // views line, tooltip values ("Orange 100%")
  insightGreen: '#348373', // positive change ("Green 80%")
  insightYellow: '#FFBE3F', // revenue bars ("Yellow 80%")
  insightYellowDeep: '#FFAD0F', // donut slice ("Yellow 100%")
  limeShade5: '#32400F', // donut slice (P Shade 5)
  statBlue: '#2971FE',
  statPurple: '#D329FE',
  statRed: '#FE2929',
  statGreen: '#35E1A3',
  statBlueTint: '#E6F4FF',
  statPurpleTint: '#FAE6FF',
  statRedTint: '#FFE6E6',
  statGreenTint: '#E6FFEE',
  starGold: '#FFB628',
  // Business App file, Buttons page (127:886): accent colours
  trueBlue: '#005CE3',
  trueBlueLighter: '#72A6F1',
  trueBlueDarker: '#00347E',
  harvestGold: '#E39700',
  harvestGoldLighter: '#F1C772',
  harvestGoldDarker: '#7E5500',
  azureishWhite: '#D9E8FF',
  azureishWhiteDarker: '#6C7A8C',
  black: '#1A1A1A',
  white: '#FFFFFF',
  pureBlack: '#000000', // Figma: Black Color / Black Color
  red: '#D61600', // Figma: Red Color / Red Color
  coral: '#F66A6A', // Figma: "Yes, Delete" on the delete bucket list sheet (25:1885)
  redTint: '#FFEEEE', // Figma: error field and OTP cell fill (7:949, 9:728)
  redBorder: '#FFA7A7', // Figma: error field and OTP cell border
  slate: '#6E7198', // Figma: Button page, Ghost border and disabled fill
  offWhite: '#F6F6F6', // Figma: Dashboard background (13:1487)
  greenShade2: '#99B847', // Figma: Green Color / Green Shade 2 (prices)
  blackTint1: '#232323', // Figma: Black Color / Black Tint 1
  blackTint2: '#464646', // Figma: Black Color / Black Tint 2
  blackTint4: '#8C8C8C', // Figma: Black Color / Black Tint 4 (picked quiz answer border, 20:2103)
  grey80: '#CCCCCC', // Figma: "Black Color Tint 3" (calendar days outside the range, radio rings)
  grey90: '#E6E6E6', // Figma: list dividers (22:1605)
  grey94: '#EFEFEF', // Figma: "Black Color Tint 2" (calendar arrow buttons)
  grey95: '#F2F2F2', // Figma: Black Color / Black Tint 7 (slider and toggle track)
  grey82: '#D2D2D2', // Figma: Black Color / Black Tint 6 (chip borders, tab divider on the business page)
  grey93: '#EEEEEE', // Figma: selected filter chip fill (47:1697)
  limeTint7: '#F7FEE7', // Figma: applied promo row fill (48:7600)
  coralTint: '#FFE8E5', // Figma: invalid promo row fill (48:7743)
  coralShade: '#E25242', // Figma: invalid promo text and icon (48:7743)
  hostOrange: '#F25726', // Figma: host name on slot cards (47:4198)
  badgeRed: '#F35C5C', // Figma: unread / cart count badges (52:8565)
  onlineGreen: '#30CC22', // Figma: online dot in Chat (47:5940)
  cancelRed: '#FF5050', // Figma: "Cancel reservation" link (47:6385)
  skyBlue: '#9CC9FE', // Figma: Moment Groups intro carousel side card (48:6274)
  butterYellow: '#FEE99C', // Figma: Moment Groups intro carousel side card (48:6274)
  heartPink: '#FACAC6', // Figma: Group Match heart button (48:4500)
  heartRed: '#DC3421', // Figma: Group Match heart (48:4500)
  deleteRed: '#E87063', // Figma: Delete Group row and Yes button (48:5138, 48:5243)
  blackTint3: '#696969', // Figma: Black Color / Black Tint 3 (wallet notes, feedback field borders, 48:5297)
  alertRed: '#EE4747', // Figma: "not verified" alert next to the name (48:3423)
  debitRed: '#CF3838', // Figma: negative wallet amounts (48:5297)
  oliveGreen: '#7E9839', // Figma: "Accepted" invite status (48:5969)
  // Adventure Quiz thermometer illustration (20:2453)
  thermometerBlue: '#2979C1',
  thermometerGrey: '#EAEAEA',
} as const;

/** Semantic colour roles used by components. */
export const colors = {
  primary: palette.lime,
  onPrimary: palette.nearBlack,
  /** Primary button pressed and loading fill. */
  primaryPressed: palette.limeShade1,
  /** Icon button pressed border. */
  primaryShade4: palette.limeShade4,
  /** Pale lime badge behind the padlock on "Enter verification code". */
  primaryTint6: palette.limeTint6,
  secondary: palette.nearBlack,
  onSecondary: palette.white,
  secondaryTint1: palette.nearBlackTint1,
  secondaryTint2: palette.nearBlackTint2,
  secondaryTint3: palette.nearBlackTint3,
  secondaryTint4: palette.nearBlackTint4,
  secondaryTint5: palette.nearBlackTint5,
  secondaryTint6: palette.nearBlackTint6,
  third: palette.orange,
  onThird: palette.white,
  base: palette.black,
  black: palette.pureBlack,
  white: palette.white,

  background: palette.white,
  /** Light grey page behind cards (Home). */
  backgroundMuted: palette.offWhite,
  /** Listing prices on cards. */
  price: palette.greenShade2,
  blackTint1: palette.blackTint1,
  blackTint2: palette.blackTint2,
  /** Hairline dividers between list rows. */
  divider: palette.grey90,
  /** Slider and toggle tracks. */
  track: palette.grey95,
  /** Days you cannot pick, unselected radio rings. */
  textDisabled: palette.grey80,
  /** Round grey icon buttons (calendar month arrows). */
  iconButtonMuted: palette.grey94,

  surface: palette.white,
  text: palette.black,
  textInverse: palette.white,
  /** Destructive buttons ("Yes, Delete"). */
  danger: palette.coral,
  onDanger: palette.white,
  /** Validation and error messages. */
  error: palette.red,
  /** Fill and border of a field or OTP cell in its error state. */
  errorSurface: palette.redTint,
  errorBorder: palette.redBorder,
  /** Dimmed backdrop behind sheets and dialogs. */
  scrim: withAlpha(palette.pureBlack, 0.5),
  /** Outline button border. */
  outline: palette.slate,
  /**
   * Disabled button fill and label, as used on the screens (Figma "Send Link",
   * 13:1254). The Buttons page template uses a translucent slate instead.
   */
  disabled: palette.nearBlackTint5,
  onDisabled: palette.nearBlack,
  /** Adventure Quiz: border of the picked answer card. */
  optionSelected: palette.blackTint4,
  /** Adventure Quiz: the picked seat on the plane. */
  seatSelected: palette.limeShade2,
  /** Business page: price badges on service and plan cards (P Shade 2). */
  priceBadge: palette.limeShade2,
  /** Business page: verified badge, "Open now". */
  open: palette.limeShade2,
  /** Filter chips: unselected border; selected fill. */
  chipBorder: palette.grey82,
  chipSelected: palette.grey93,
  /** Adventure Quiz: emoji and photo-collage circles (Black Tint 7). */
  bubble: palette.grey95,
  /** Adventure Quiz thermometer: mercury and empty tube. */
  thermometerFill: palette.thermometerBlue,
  thermometerEmpty: palette.thermometerGrey,
  /** Booking: promo code applied / invalid rows (48:7600, 48:7743), host name on slot cards. */
  successSurface: palette.limeTint7,
  invalidSurface: palette.coralTint,
  invalid: palette.coralShade,
  host: palette.hostOrange,
  /** Bookings: unread and cart count badges, online dot, cancel link. */
  badge: palette.badgeRed,
  onBadge: palette.white,
  /** Profile: secondary grey text and field borders (Black Tint 3). */
  blackTint3: palette.blackTint3,
  /** Profile: unverified identity alert dot. */
  alert: palette.alertRed,
  /** Wallet: money going out. Money coming in uses `price`. */
  debit: palette.debitRed,
  /** Invite friends: "Accepted". */
  accepted: palette.oliveGreen,
  online: palette.onlineGreen,
  cancel: palette.cancelRed,
  /** Groups: intro carousel cards, Group Match heart, Delete Group. */
  introBlue: palette.skyBlue,
  introYellow: palette.butterYellow,
  heartSurface: palette.heartPink,
  heart: palette.heartRed,
  destructive: palette.deleteRed,
  /** Pressed overlay for buttons without a pressed colour of their own. */
  pressedOverlay: withAlpha(palette.pureBlack, 0.1),
} as const;

export type ColorToken = keyof typeof colors;

/** Brand marks on the share sheet (Figma 47:2457), drawn as gradients behind white glyphs. */
export const brandGradients = {
  whatsapp: ['#60D66A', '#20B038'],
  messenger: ['#0099FF', '#784DFF', '#A033FF', '#FF5280', '#FF7061'],
} as const;

/**
 * A 6-digit hex colour at the given opacity, as `rgba()`.
 * withAlpha(colors.secondary, 0) -> 'rgba(19, 22, 23, 0)' (for gradients that fade a token).
 */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`withAlpha expects #RRGGBB, got ${hex}`);
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h ?? '0', 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Promo banner backgrounds on Home (Figma 13:1492 and its neighbours). */
export const promoColors = {
  teal: '#06B3C4',
  blue: '#77B5FE',
  coral: '#DE725B',
} as const;

/** Tile colours behind host cut-out photos on Top Hosts (Figma 17:1075 ...), used in turn. */
export const hostTileColors = ['#FFEAA7', '#A29BFE', '#74B9FF', '#FF7675'] as const;
