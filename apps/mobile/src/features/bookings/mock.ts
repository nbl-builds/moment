// Mocks for Booking Status until the backend has these (docs/ROADMAP.md,
// "To wire after UI"). Same signatures the real calls will have.

export interface RescheduleResult {
  bookingId: string;
  startsAt: string;
  endsAt: string;
  status: 'confirmed' | 'pending';
}

/** Moved times, kept in memory for this app session so the reservation shows the new time. */
const moved = new Map<string, { startsAt: string; endsAt: string }>();

/**
 * "Reschedule reservation". MOCK: there is no reschedule RPC yet, so nothing
 * changes on the server; the new time is remembered for this session only.
 * Replace with a `reschedule_booking(booking, starts_at, staff)` RPC that
 * checks availability and the cancellation window like `create_booking`.
 */
export async function rescheduleBooking(args: { bookingId: string; startsAt: string; endsAt: string; staffId?: string }): Promise<RescheduleResult> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  moved.set(args.bookingId, { startsAt: args.startsAt, endsAt: args.endsAt });
  return { bookingId: args.bookingId, startsAt: args.startsAt, endsAt: args.endsAt, status: 'confirmed' };
}

/** The mocked new time for a booking, if it was rescheduled in this session. */
export const rescheduledTime = (bookingId: string) => moved.get(bookingId) ?? null;

/**
 * Voice notes in Chat. MOCK: `chat-attachments` doesn't accept audio yet, so
 * the recording stays on the device and is shown only to the sender; nothing
 * is sent. Replace with an upload to `chat-attachments` (allow audio/m4a) and
 * `api.chat.send` with the attachment.
 */
export async function uploadVoiceNote(args: { conversationId: string; uri: string; durationMs: number }) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { localUri: args.uri, durationMs: args.durationMs, conversationId: args.conversationId, uploaded: false as const };
}
