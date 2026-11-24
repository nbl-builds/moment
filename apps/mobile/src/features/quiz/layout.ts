// Adventure Quiz measurements from Figma (428 x 926 frames, 44pt status bar).

export const QUIZ = {
  inset: 20,
  /** Status bar -> back / close icons (28pt). */
  barTop: 16,
  icon: 28,
  /** Icons -> question title (H3, centred). */
  barToTitle: 37,
  /** Title box width per question (by sort_order), so lines break as in each frame (Figma width + 8pt for rendering slack). */
  titleWidths: { 1: 291, 2: 311, 3: 267, 4: 327, 5: 327, 6: 311 } as Record<number, number>,
  /** Answers start at y 255 in every frame: a two-line title box (72pt) and 58pt below it. */
  titleHeight: 72,
  titleToOptions: 58,
  /** Frame y where answers start. */
  optionsTop: 255,
  /** Auto-advance after a pick, so the selected state is seen first. */
  advanceMs: 300,
  /** The "Thank you" screen stays at least this long, so it doesn't flash. */
  analyzingMinMs: 1500,

  photo: { height: 110, gap: 20, radius: 15, padding: 10, image: { width: 143, height: 90, radius: 15 }, textGap: 62, textInset: 32 },
  emoji: { height: 182, gap: 20, radius: 15, size: 150, left: 36, textLeft: 236 },
  /** Glass illustration (20:2281): 342 x 438, labels at 26% and 66% of its height; water line at ~42%. */
  glass: { width: 342, height: 437.8, top: 288, waterLine: 0.42 },
  /** Plane (20:2414) exported 428 x 711 from y 220; seats 35 x 34 at these points (frame coordinates). */
  plane: { width: 428, height: 711, top: 220, seat: { width: 35, height: 34 }, seatX: [130, 169, 219, 258], seatY: [397, 569, 740] },
  /** Thermometer (20:2501): 104.8 x 370 at y 318; the tube runs from y 36.3 (max) to 296.4 (min). */
  thermometer: { width: 104.791, height: 370, top: 318, tubeX: 39.8, tubeWidth: 24.18, tubeTop: 36.29, tubeZero: 296.4, fillBottom: 318.08, knob: 28 },
} as const;
