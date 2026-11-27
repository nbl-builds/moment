// Voice notes (Inbox composer mic). Same rule as the mobile app
// (apps/mobile/src/features/bookings/mock.ts `uploadVoiceNote`): the
// chat-attachments bucket doesn't accept audio yet, so a recorded note stays on
// this device and nothing is sent. Replace with an upload to chat-attachments
// (allow audio/webm and audio/m4a) and `api.chat.send` with the attachment.
// Listed in docs/ROADMAP.md under "To wire after UI".

export async function uploadVoiceNote(args: { conversationId: string; blob: Blob; durationMs: number }) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { localUrl: URL.createObjectURL(args.blob), durationMs: args.durationMs, conversationId: args.conversationId, uploaded: false as const };
}
