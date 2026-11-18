import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Message } from '../types';
import type { CreateGroupForm, FeedbackForm, SendMessageForm } from '../validation/social';
import { FEEDBACK_TOPIC_LABELS } from '../validation/social';
import type { PageOptions } from './catalog';
import { requireUserId, unwrap, unwrapRequired, type MomentSupabaseClient } from './errors';

// Groups, chat and support.

export function createGroupsApi(db: MomentSupabaseClient) {
  return {
    /** "Create new group". The owner membership and group chat are created by trigger. */
    create: async (form: CreateGroupForm) => {
      const userId = await requireUserId(db);
      return unwrap(
        db
          .from('groups')
          .insert({
            owner_id: userId,
            name: form.name,
            description: form.description ?? null,
            destination_city: form.destinationCity ?? null,
            start_date: form.startDate ?? null,
            end_date: form.endDate ?? null,
            visibility: form.visibility,
            is_open_to_match: form.isOpenToMatch,
            max_members: form.maxMembers,
            interest_tag_ids: form.interestTagIds,
          })
          .select()
          .single(),
      );
    },

    /** My Groups. */
    listMine: async () => {
      const userId = await requireUserId(db);
      return unwrap(
        db
          .from('group_members')
          .select('role, status, group:groups!inner(*, members:group_members(count))')
          .eq('user_id', userId)
          .in('status', ['active', 'invited'])
          .order('joined_at', { ascending: false }),
      );
    },

    get: (groupId: string) =>
      unwrapRequired(
        db
          .from('groups')
          .select('*, members:group_members(user_id, role, status, profile:profiles!group_members_user_id_fkey(id, display_name, avatar_url))')
          .eq('id', groupId)
          .maybeSingle(),
        'Group',
      ),

    rename: (groupId: string, name: string) => unwrap(db.from('groups').update({ name }).eq('id', groupId)),

    updateSettings: (groupId: string, settings: { visibility: 'private' | 'public'; isOpenToMatch?: boolean }) =>
      unwrap(
        db
          .from('groups')
          .update({ visibility: settings.visibility, ...(settings.isOpenToMatch === undefined ? {} : { is_open_to_match: settings.isOpenToMatch }) })
          .eq('id', groupId),
      ),

    remove: (groupId: string) => unwrap(db.from('groups').delete().eq('id', groupId)),

    /** Group Match. */
    findMatching: ({ city, start, end, limit = 20 }: { city?: string; start?: string; end?: string; limit?: number } = {}) =>
      unwrap(db.rpc('find_matching_groups', { p_city: city, p_start: start, p_end: end, p_limit: limit })),

    /** Ask to join a public group; a group admin approves. */
    requestToJoin: async (groupId: string) => {
      const userId = await requireUserId(db);
      return unwrap(db.from('group_members').insert({ group_id: groupId, user_id: userId, status: 'requested', role: 'member' }));
    },

    /** Accept an invite, or leave. */
    setMyStatus: async (groupId: string, status: 'active' | 'left') => {
      const userId = await requireUserId(db);
      return unwrap(db.from('group_members').update({ status }).eq('group_id', groupId).eq('user_id', userId));
    },
  };
}

export interface ChatMessageEvent {
  type: 'INSERT' | 'UPDATE';
  message: Message;
}

export function createChatApi(db: MomentSupabaseClient) {
  return {
    /** Chat list: conversations I take part in, latest first. Business inboxes come from `business.inbox`. */
    listConversations: async ({ limit = 30, offset = 0 }: PageOptions = {}) => {
      const userId = await requireUserId(db);
      return unwrap(
        db
          .from('conversation_participants')
          .select(
            `last_read_at, is_muted,
            conversation:conversations!inner(id, type, last_message_at, booking_id,
              business:businesses(id, name, logo_url), group:groups(id, name, cover_url),
              participants:conversation_participants(user_id, profile:profiles(id, display_name, avatar_url)))`,
          )
          .eq('user_id', userId)
          .order('last_message_at', { referencedTable: 'conversations', ascending: false, nullsFirst: false })
          .range(offset, offset + limit - 1),
      );
    },

    startDirect: (userId: string) => unwrap(db.rpc('start_direct_conversation', { p_user_id: userId })),

    /** "Chat with business" from a listing or booking. */
    startWithBusiness: (businessId: string, bookingId?: string) =>
      unwrap(db.rpc('start_business_conversation', { p_business_id: businessId, p_booking_id: bookingId })),

    /** Messages newest first; pass `before` (a created_at) to page back. */
    listMessages: (conversationId: string, { before, limit = 50 }: { before?: string; limit?: number } = {}) => {
      let q = db
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (before) q = q.lt('created_at', before);
      return unwrap(q);
    },

    /** Send as yourself, or as a business (`asBusinessId`) from the shared inbox. */
    send: async (form: SendMessageForm, asBusinessId?: string) => {
      const userId = await requireUserId(db);
      return unwrap(
        db
          .from('messages')
          .insert({
            conversation_id: form.conversationId,
            sender_id: userId,
            sender_business_id: asBusinessId ?? null,
            body: form.body ?? null,
            attachments: form.attachments,
          })
          .select()
          .single(),
      );
    },

    markRead: async (conversationId: string) => {
      const userId = await requireUserId(db);
      return unwrap(
        db
          .from('conversation_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', userId),
      );
    },

    /**
     * Live messages for one conversation over the private `conversation:<id>`
     * channel (authorised by RLS on realtime.messages). Returns an unsubscribe function.
     */
    subscribe: (conversationId: string, onMessage: (event: ChatMessageEvent) => void): (() => void) => {
      let channel: RealtimeChannel | undefined;
      let closed = false;
      void db.realtime.setAuth().then(() => {
        if (closed) return;
        channel = db
          .channel(`conversation:${conversationId}`, { config: { private: true } })
          .on('broadcast', { event: 'INSERT' }, ({ payload }) => {
            const record = (payload as { record?: Message }).record;
            if (record) onMessage({ type: 'INSERT', message: record });
          })
          .on('broadcast', { event: 'UPDATE' }, ({ payload }) => {
            const record = (payload as { record?: Message }).record;
            if (record) onMessage({ type: 'UPDATE', message: record });
          })
          .subscribe();
      });
      return () => {
        closed = true;
        if (channel) void db.removeChannel(channel);
      };
    },
  };
}

export function createSupportApi(db: MomentSupabaseClient) {
  return {
    /** "Give us feedback" and Support: opens a ticket with the first message. */
    submitFeedback: async (form: FeedbackForm) => {
      const userId = await requireUserId(db);
      const ticket = await unwrap(
        db
          .from('support_tickets')
          .insert({
            user_id: userId,
            subject: `Feedback: ${FEEDBACK_TOPIC_LABELS[form.topic]}`,
            booking_id: form.bookingId ?? null,
            business_id: form.businessId ?? null,
          })
          .select()
          .single(),
      );
      await unwrap(db.from('support_messages').insert({ ticket_id: ticket.id, sender_id: userId, body: form.message }));
      return ticket;
    },

    listTickets: async () => {
      const userId = await requireUserId(db);
      return unwrap(db.from('support_tickets').select('*').eq('user_id', userId).order('updated_at', { ascending: false }));
    },

    listMessages: (ticketId: string) =>
      unwrap(db.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at')),

    reply: async (ticketId: string, body: string) => {
      const userId = await requireUserId(db);
      return unwrap(db.from('support_messages').insert({ ticket_id: ticketId, sender_id: userId, body }).select().single());
    },
  };
}
