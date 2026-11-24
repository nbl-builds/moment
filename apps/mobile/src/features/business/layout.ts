// Business page measurements from Figma ("Business Look", 428 x 926 frames,
// 44pt status bar). Frame y values below include the status bar.

export const BIZ = {
  inset: 20,
  /** Hero photo 555pt tall from the top of the screen. */
  heroHeight: 553,
  /** Panel top when collapsed (25:2265) and expanded (47:2913). */
  panelCollapsed: 507,
  panelExpanded: 128,
  panelRadius: 20,
  /** Top buttons: 44pt white squares, radius 12, 12pt below the status bar. */
  topButton: { size: 44, radius: 12, top: 12 },
  dots: { bottom: 73 },
  logo: { size: 74, border: 4, radius: 15, overhang: 29 },
  /** Offsets inside the panel (from its top edge). */
  header: { handleTop: 14, nameTop: 50, addressTop: 87, metaTop: 115, tabsTop: 159 },
  tabs: { width: 97, height: 36, gap: 16, radius: 12, dividerGap: 14, contentGap: 20 },
  /** Expanded: tabs 30pt below the panel top (handle at 12). */
  pinnedTabsTop: 30,
  chip: { radius: 10, gap: 16 },
  card: { height: 100, radius: 15, padding: 10, thumb: 80, thumbRadius: 12, gap: 16, button: 40 },
  priceBadge: { width: 50, height: 24, radius: 8 },
  cart: { height: 82, radius: 15, bottomGap: 12, trash: 42 },
  plan: { height: 222, radius: 15, imageInset: 8, imageHeight: 134 },
  review: { avatar: 50, avatarRadius: 10, photo: { width: 56, height: 64, radius: 8, gap: 16 } },
  map: { height: 142, radius: 25 },
} as const;
