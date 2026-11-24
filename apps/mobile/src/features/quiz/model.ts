import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/api';

// Adventure Quiz (Figma "Costumer Dashboard (Adventure Quiz)", 20:2060 ... 20:3543).
// Questions come from Supabase; each kind turns its interaction into one answer
// row, so the server scores every question the same way (see docs/DATABASE.md).

export type QuizQuestion = Awaited<ReturnType<typeof api.quiz.getQuestions>>[number];
export type QuizAnswer = QuizQuestion['answers'][number];
export type QuizBadge = NonNullable<Awaited<ReturnType<typeof api.quiz.submit>>['badge']>;

/** What the user picked on one question. `seat` / `value` restore the picture when going back. */
export interface QuizPick {
  answerId: string;
  seat?: number;
  value?: number;
}

export interface GlassConfig {
  top: number;
  bottom: number;
}
export interface SeatConfig {
  rows: number;
  /** Answer sort_order per seat column, left to right. */
  columns: number[];
}
export interface SliderConfig {
  min: number;
  max: number;
  default: number;
  unit: string;
  buckets: { answer: number; max: number }[];
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

export function glassConfig(q: QuizQuestion): GlassConfig {
  const c = obj(q.config);
  return { top: num(c.top, 1), bottom: num(c.bottom, 2) };
}

export function seatConfig(q: QuizQuestion): SeatConfig {
  const c = obj(q.config);
  const columns = Array.isArray(c.columns) ? c.columns.map((n) => num(n, 1)) : [1, 2, 2, 1];
  return { rows: num(c.rows, 3), columns };
}

export function sliderConfig(q: QuizQuestion): SliderConfig {
  const c = obj(q.config);
  const buckets = Array.isArray(c.buckets)
    ? c.buckets.map((b) => ({ answer: num(obj(b).answer, 1), max: num(obj(b).max, Infinity) }))
    : [];
  return { min: num(c.min, 0), max: num(c.max, 50), default: num(c.default, 20), unit: typeof c.unit === 'string' ? c.unit : 'C', buckets };
}

/** The answer a slider value falls into (buckets in order; the last one is open-ended). */
export function answerForValue(q: QuizQuestion, value: number): QuizAnswer | undefined {
  const { buckets } = sliderConfig(q);
  const bucket = buckets.find((b) => value <= b.max) ?? buckets[buckets.length - 1];
  return answerAt(q, bucket?.answer);
}

/** Answer by its sort_order. */
export const answerAt = (q: QuizQuestion, sortOrder: number | undefined) => q.answers.find((a) => a.sort_order === sortOrder);

// ---------------------------------------------------------------------------
// Guests: answers wait on the device while they sign in, then Home resumes the
// quiz and submits them.
// ---------------------------------------------------------------------------

const PENDING_KEY = 'moment.pendingQuiz';
/** Answers older than this are dropped (the guest walked away). */
const PENDING_TTL_MS = 60 * 60 * 1000;

export async function savePendingQuiz(answerIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ answerIds, savedAt: Date.now() }));
  } catch {
    // Without storage the guest just retakes the quiz after signing in.
  }
}

export async function takePendingQuiz({ peek = false } = {}): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { answerIds?: unknown; savedAt?: unknown };
    const fresh = typeof parsed.savedAt === 'number' && Date.now() - parsed.savedAt < PENDING_TTL_MS;
    const ids = Array.isArray(parsed.answerIds) ? parsed.answerIds.filter((id): id is string => typeof id === 'string') : [];
    if (!peek || !fresh) await AsyncStorage.removeItem(PENDING_KEY);
    return fresh && ids.length ? ids : null;
  } catch {
    return null;
  }
}
