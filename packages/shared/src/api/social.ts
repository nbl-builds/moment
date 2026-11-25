import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Message, TablesInsert, TablesUpdate } from '../types';
import type { CreateGroupForm, FeedbackForm, GroupSettings, SendMessageForm } from '../validation/social';
import { FEEDBACK_TOPIC_LABELS } from '../validation/social';
import { LISTING_CARD_SELECT, type PageOptions } from './catalog';
import { ApiError, requireUserId, unwrap, unwrapRequired, type MomentSupabaseClient } from './errors';

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
            cover_url: form.coverUrl ?? null,
          })
          .select()
          .single(),
      );
    },

    /** Groups list: my groups (active or invited), newest first, with member avatars. */
    listMine: async () => {
      const userId = await requireUserId(db);
      return unwrap(
        db
          .from('group_members')
          .select(
            `role, status, group:groups!inner(id, name, description, cover_url, created_at, owner_id, visibility, sharing_enabled,
              members:group_members(user_id, status, role, profile:profiles!group_members_user_id_fkey(id, display_name, avatar_url)))`,
          )
          .eq('user_id', userId)
          .in('status', ['active', 'invited'])
          .order('created_at', { referencedTable: 'groups', ascending: false }),
      );
    },

    /** "Upload Cover Photo": into `group-covers/<user_id>/...`; returns the storage ref for `create`. */
    uploadCover: async (file: { body: ArrayBuffer; contentType: string; extension: string }) => {
      const userId = await requireUserId(db);
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.extension}`;
      const { error } = await db.storage.from('group-covers').upload(path, file.body, { contentType: file.contentType });
      if (error) throw new ApiError('network', `Could not upload the photo: ${error.message}`, undefined, undefined, error);
      return `storage://group-covers/${path}`;
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

    /**
     * Group Settings. Making a group private also takes it out of Group Match
     * (matching needs a public group); opening it to match makes it public.
     */
    updateSettings: (groupId: string, s: GroupSettings) => {
      const patch: TablesUpdate<'groups'> = {};
      if (s.visibility !== undefined) patch.visibility = s.visibility;
      if (s.visibility === 'private') patch.is_open_to_match = false;
      if (s.isOpenToMatch !== undefined) {
        patch.is_open_to_match = s.isOpenToMatch;
        if (s.isOpenToMatch) patch.visibility = 'public';
      }
      if (s.sharingEnabled !== undefined) patch.sharing_enabled = s.sharingEnabled;
      if (s.likesVisibility !== undefined) patch.likes_visibility = s.likesVisibility;
      return unwrap(db.from('groups').update(patch).eq('id', groupId));
    },

    /** "Liked by group": experiences and businesses members saved to the group, newest first (RLS applies likes visibility). */
    likes: (groupId: string) =>
      unwrap(
        db
          .from('group_likes')
          .select(
            `id, user_id, created_at, listing:listings(${LISTING_CARD_SELECT}), business:businesses(id, slug, name, logo_url, cover_url, rating_avg, rating_count),
            profile:profiles!group_likes_user_id_fkey(id, display_name, avatar_url)`,
          )
          .eq('group_id', groupId)
          .order('created_at', { ascending: false }),
      ),

    /** Save an experience (or a business) to a group. Saving twice is a no-op. */
    like: async (groupId: string, target: { listingId: string } | { businessId: string }) => {
      const userId = await requireUserId(db);
      const row: TablesInsert<'group_likes'> = {
        group_id: groupId,
        user_id: userId,
        listing_id: 'listingId' in target ? target.listingId : null,
        business_id: 'businessId' in target ? target.businessId : null,
      };
      const { error } = await db.from('group_likes').insert(row);
      if (error && error.code !== '23505') throw new ApiError('network', error.message, undefined, undefined, error);
    },

    /** "Add to Groups" ticks: my groups where I already saved this experience or business. */
    likedGroupIds: async (target: { listingId: string } | { businessId: string }) => {
      const userId = await requireUserId(db);
      let q = db.from('group_likes').select('group_id').eq('user_id', userId);
      q = 'listingId' in target ? q.eq('listing_id', target.listingId) : q.eq('business_id', target.businessId);
      return (await unwrap(q)).map((r) => r.group_id);
    },

    unlike: async (groupId: string, target: { listingId: string } | { businessId: string }) => {
      const userId = await requireUserId(db);
      let q = db.from('group_likes').delete().eq('group_id', groupId).eq('user_id', userId);
      q = 'listingId' in target ? q.eq('listing_id', target.listingId) : q.eq('business_id', target.businessId);
      return unwrap(q);
    },

    /** Group page > Group Match: groups to match with, and whether this group already asked. */
    matches: async (groupId: string) => {
      const groups = await unwrap(db.rpc('group_matches', { p_group_id: groupId }));
      if (!groups.length) return [];
      // Faces for each card ("Liked by"): members of public groups are readable.
      const members = await unwrap(
        db
          .from('group_members')
          .select('group_id, role, profile:profiles!group_members_user_id_fkey(id, display_name, avatar_url)')
          .in('group_id', groups.map((g) => g.id))
          .eq('status', 'active'),
      );
      return groups.map((g) => ({
        ...g,
        members: members.filter((m) => m.group_id === g.id && m.profile).map((m) => m.profile!),
      }));
    },

    /** Heart on a Group Match card. */
    sendMatch: async (fromGroupId: string, toGroupId: string) => {
      const userId = await requireUserId(db);
      const { error } = await db.from('group_match_requests').insert({ from_group_id: fromGroupId, to_group_id: toGroupId, created_by: userId });
      if (error && error.code !== '23505') throw new ApiError('network', error.message, undefined, undefined, error);
    },

    /** Take back a pending match request. */
    withdrawMatch: (fromGroupId: string, toGroupId: string) =>
      unwrap(db.from('group_match_requests').delete().eq('from_group_id', fromGroupId).eq('to_group_id', toGroupId)),

    /** Group page > Recommended Group: listing cards ranked for the whole group. */
    recommendations: async (groupId: string, limit = 10) => {
      const ranked = await unwrap(db.rpc('group_recommendations', { p_group_id: groupId, p_limit: limit }));
      const ids = ranked.map((r) => r.listing_id);
      if (!ids.length) return [];
      const rows = await unwrap(db.from('listings').select(LISTING_CARD_SELECT).in('id', ids).order('sort_order', { referencedTable: 'listing_media' }));
      const byId = new Map(rows.map((r) => [r.id, r]));
      return ids.map((id) => byId.get(id)).filter((r): r is (typeof rows)[number] => Boolean(r));
    },

    /** Invite others: Moment users by name or exact phone number. */
    findPeople: (query: string) => unwrap(db.rpc('find_people', { p_query: query })),

    /** Invite people (they see the group as invited until they accept). Already in the group: skipped. */
    invite: async (groupId: string, userIds: string[]) => {
      const me = await requireUserId(db);
      if (!userIds.length) return;
      const { error } = await db
        .from('group_members')
        .upsert(userIds.map((id) => ({ group_id: groupId, user_id: id, role: 'member' as const, status: 'invited' as const, invited_by: me })), {
          onConflict: 'group_id,user_id',
          ignoreDuplicates: true,
        });
      if (error) throw new ApiError('network', error.message, undefined, undefined, error);
    },

    /** Members sheet: admins remove a member (not the owner). */
    removeMember: (groupId: string, userId: string) => unwrap(db.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)),

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
     * Uploads a photo to `chat-attachments/<conversation_id>/...` (participants
     * only) and returns the attachment to pass to `send`.
     */
    uploadAttachment: async (conversationId: string, file: { body: ArrayBuffer; contentType: string; extension: string }) => {
      const path = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.extension}`;
      const { error } = await db.storage.from('chat-attachments').upload(path, file.body, { contentType: file.contentType });
      if (error) throw new ApiError('network', `Could not upload the photo: ${error.message}`, undefined, undefined, error);
      return { path, mimeType: file.contentType };
    },

    /** A short-lived URL for a chat attachment (the bucket is private). */
    attachmentUrl: async (path: string, expiresInSeconds = 3600) => {
      const { data, error } = await db.storage.from('chat-attachments').createSignedUrl(path, expiresInSeconds);
      if (error) throw new ApiError('network', error.message, undefined, undefined, error);
      return data.signedUrl;
    },

    /**
     * A conversation's live channel: new and edited messages from the server,
     * plus "typing" events other participants broadcast. `typing()` tells the
     * others you are typing (throttle it). Call `leave()` when done.
     */
    join: (
      conversationId: string,
      on: { message?: (event: ChatMessageEvent) => void; typing?: (e: { userId: string }) => void },
      me?: string,
    ) => {
      let channel: RealtimeChannel | undefined;
      let closed = false;
      void db.realtime.setAuth().then(() => {
        if (closed) return;
        channel = db
          .channel(`conversation:${conversationId}`, { config: { private: true, broadcast: { self: false } } })
          .on('broadcast', { event: 'INSERT' }, ({ payload }) => {
            const record = (payload as { record?: Message }).record;
            if (record) on.message?.({ type: 'INSERT', message: record });
          })
          .on('broadcast', { event: 'UPDATE' }, ({ payload }) => {
            const record = (payload as { record?: Message }).record;
            if (record) on.message?.({ type: 'UPDATE', message: record });
          })
          .on('broadcast', { event: 'typing' }, ({ payload }) => {
            const userId = (payload as { userId?: string }).userId;
            if (userId && userId !== me) on.typing?.({ userId });
          })
          .subscribe();
      });
      return {
        typing: () => {
          if (channel && me) void channel.send({ type: 'broadcast', event: 'typing', payload: { userId: me } });
        },
        leave: () => {
          closed = true;
          if (channel) void db.removeChannel(channel);
        },
      };
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
