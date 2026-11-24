// Bucket List measurements from Figma (428 x 926 frames, 44pt status bar).

export const BUCKET = {
  inset: 20,
  /** Sheets: content starts 38pt below the top edge (option sheets) and ends ~38pt above the frame bottom. */
  sheetTop: 38,
  sheetBottom: 4,
  option: { height: 68, radius: 15, gap: 20, iconInset: 19, textLeft: 67 },
  /** "Your Bucketlist" picker (24:1225). */
  picker: { headerTop: 20, headerToCreate: 25, createHeight: 68, createToRows: 38, thumb: 60, rowGap: 20, textGap: 20 },
  /** "Give it a name" / "Rename" (24:1444): title 21 below the top, field 29 below it, button 34 below. */
  nameSheet: { top: 21, titleToField: 29, fieldToButton: 34, field: { padding: 18, radius: 15 } },
  /** All lists (24:2071): 100pt white cards with an 80pt thumbnail. */
  row: { height: 100, radius: 15, padding: 10, thumb: 80, thumbRadius: 12, textGap: 20, gap: 20 },
  illustration: 98,
} as const;
