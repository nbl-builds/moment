import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/use-session';
import { api } from '@/lib/api';
import { OPEN_STATUSES } from './api';

/** Support replies come from the Moment team's admin tool; poll while the chat is open. */
const POLL_MS = 15_000;

export const supportKeys = {
  tickets: (userId?: string) => ['support', 'tickets', userId] as const,
  messages: (ticketId?: string) => ['support', 'messages', ticketId] as const,
};

/** The user's most recent ticket that is still open or pending, or null. */
export function useOpenTicket() {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: supportKeys.tickets(userId),
    queryFn: async () => {
      const tickets = await api.support.listTickets();
      // Feedback tickets ("Feedback: ...") are one-off; the chat is the latest open help ticket.
      return tickets.find((t) => (OPEN_STATUSES as readonly string[]).includes(t.status) && !t.subject.startsWith('Feedback:')) ?? null;
    },
    enabled: Boolean(userId),
  });
}

export function useTicketMessages(ticketId: string | undefined) {
  return useQuery({
    queryKey: supportKeys.messages(ticketId),
    queryFn: () => api.support.listMessages(ticketId as string),
    enabled: Boolean(ticketId),
    refetchInterval: POLL_MS,
  });
}

export function useRefreshSupport() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ['support'] });
}
