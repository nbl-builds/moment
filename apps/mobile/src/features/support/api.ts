import type { FeedbackTopic } from '@moment/shared';
import { api } from '@/lib/api';

// Thin helpers over `api.support` (packages/shared/src/api/social.ts). The
// support API has no "area" field, so:
// - Give us feedback folds the picked area into the message as a prefix.

/** Give us feedback > "Select the topic": which part of the app it is about. */
export const FEEDBACK_AREAS = [
  { value: 'home', label: 'Home' },
  { value: 'search', label: 'Search and filters' },
  { value: 'booking', label: 'Booking' },
  { value: 'payments', label: 'Payments' },
  { value: 'groups', label: 'Groups' },
  { value: 'profile', label: 'Profile' },
  { value: 'other', label: 'Other' },
] as const;
export type FeedbackArea = (typeof FEEDBACK_AREAS)[number]['value'];

export function areaLabel(area: FeedbackArea): string {
  return FEEDBACK_AREAS.find((a) => a.value === area)?.label ?? 'Other';
}

/** Sends feedback as a support ticket; the area goes in front of the message ("[Area: Booking] ..."). */
export function sendFeedback({ topic, area, message }: { topic: FeedbackTopic; area: FeedbackArea; message: string }) {
  return api.support.submitFeedback({ topic, message: `[Area: ${areaLabel(area)}] ${message.trim()}` });
}

/** Contact support with no open ticket: the first message opens one. */
export function openSupportTicket(message: string) {
  return api.support.openTicket('Help from the app', message.trim());
}

/** Tickets the user can still write in. */
export const OPEN_STATUSES = ['open', 'pending'] as const;
