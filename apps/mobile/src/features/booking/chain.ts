// A services cart is one visit: services run back to back. For each start
// time of the first service, find a free time for each next service that
// starts when the previous one ends (or within a short wait).

export interface FreeTime {
  starts_at: string;
  ends_at: string;
  staff_id: string;
}

/** Longest wait between two services in one visit. */
const MAX_GAP_MS = 30 * 60_000;

export interface ChainedVisit {
  /** One entry per service, in cart order. */
  times: FreeTime[];
  startsAt: string;
  endsAt: string;
}

export function chainVisits(timesPerService: FreeTime[][]): ChainedVisit[] {
  const [first, ...rest] = timesPerService;
  if (!first) return [];
  const visits: ChainedVisit[] = [];
  for (const start of first) {
    const times = [start];
    let ok = true;
    for (const options of rest) {
      const prevEnd = new Date(times[times.length - 1]!.ends_at).getTime();
      const next = options.find((t) => {
        const s = new Date(t.starts_at).getTime();
        return s >= prevEnd && s - prevEnd <= MAX_GAP_MS;
      });
      if (!next) {
        ok = false;
        break;
      }
      times.push(next);
    }
    if (ok) visits.push({ times, startsAt: start.starts_at, endsAt: times[times.length - 1]!.ends_at });
  }
  return visits;
}
