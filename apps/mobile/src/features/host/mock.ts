// Mock for Host Profile until reports have a backend (docs/ROADMAP.md,
// "To wire after UI"). Same signature the real call will have.

export const REPORT_REASONS = [
  { key: 'inaccurate', label: 'Their profile or listings are inaccurate' },
  { key: 'scam', label: 'I think it’s a scam' },
  { key: 'offensive', label: 'They were rude or offensive' },
  { key: 'unsafe', label: 'I felt unsafe' },
  { key: 'off_platform', label: 'They asked me to pay outside Moment' },
  { key: 'other', label: 'Something else' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['key'];

/**
 * "Report host". MOCK: nothing is stored; resolves after a short delay with a
 * reference. Replace with an insert into a `reports` table (reporter, staff,
 * reason, note) that the super admin reviews.
 */
export async function reportHost(args: { hostId: string; reason: ReportReason; note?: string }) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { reference: `REP-${Date.now().toString(36).toUpperCase()}`, hostId: args.hostId, reason: args.reason };
}
