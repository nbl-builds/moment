-- Chat: direct, consumer-business (shared business inbox) and group conversations.
-- Realtime: new messages are broadcast to the private channel conversation:<id>.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null,
  business_id uuid references public.businesses (id) on delete cascade,
  group_id uuid unique references public.groups (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (type = 'direct' and business_id is null and group_id is null)
    or (type = 'business' and business_id is not null and group_id is null)
    or (type = 'group' and group_id is not null and business_id is null)
  )
);
create index conversations_business_idx on public.conversations (business_id, last_message_at desc);
create index conversations_booking_idx on public.conversations (booking_id);
create index conversations_created_by_idx on public.conversations (created_by);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  is_muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_participants_user_idx on public.conversation_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  sender_business_id uuid references public.businesses (id) on delete set null, -- staff replying as the business
  body text check (char_length(body) <= 4000),
  attachments jsonb not null default '[]', -- [{"path": "...", "type": "image/jpeg"}]
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  check (body is not null or jsonb_array_length(attachments) > 0)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id);
create index messages_sender_business_idx on public.messages (sender_business_id);

-- ---------------------------------------------------------------------------
-- Access helper
-- ---------------------------------------------------------------------------
create function private.can_access_conversation(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = cid
      and (
        exists (select 1 from public.conversation_participants p
                where p.conversation_id = c.id and p.user_id = (select auth.uid()))
        or (c.business_id is not null and private.is_business_member(c.business_id))
        or (c.group_id is not null and private.is_group_member(c.group_id))
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function private.groups_create_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.conversations (type, group_id, created_by)
  values ('group', new.id, new.owner_id)
  on conflict (group_id) do nothing;
  return null;
end;
$$;

create trigger groups_create_conversation after insert on public.groups
  for each row execute function private.groups_create_conversation();

create function private.messages_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- Only body edits and soft deletes.
    new.conversation_id := old.conversation_id;
    new.sender_id := old.sender_id;
    new.sender_business_id := old.sender_business_id;
    new.created_at := old.created_at;
    if new.body is distinct from old.body then
      new.edited_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger messages_before_write before insert or update on public.messages
  for each row execute function private.messages_before_write();

create function private.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  if new.sender_id is not null then
    update public.conversation_participants
    set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.sender_id;
  end if;
  return null;
end;
$$;

create trigger messages_after_insert after insert on public.messages
  for each row execute function private.messages_after_insert();

create function private.messages_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'conversation:' || coalesce(new.conversation_id, old.conversation_id)::text,
    tg_op, tg_op, tg_table_name, tg_table_schema, new, old
  );
  return null;
end;
$$;

create trigger messages_broadcast after insert or update on public.messages
  for each row execute function private.messages_broadcast();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create function public.start_direct_conversation(p_user_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_conversation public.conversations;
begin
  if v_uid is null then
    raise exception 'Sign in to chat' using errcode = '42501';
  end if;
  if p_user_id = v_uid or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Invalid recipient' using errcode = '22023';
  end if;

  select c.* into v_conversation
  from public.conversations c
  where c.type = 'direct'
    and exists (select 1 from public.conversation_participants p where p.conversation_id = c.id and p.user_id = v_uid)
    and exists (select 1 from public.conversation_participants p where p.conversation_id = c.id and p.user_id = p_user_id)
  limit 1;

  if not found then
    insert into public.conversations (type, created_by) values ('direct', v_uid)
    returning * into v_conversation;
    insert into public.conversation_participants (conversation_id, user_id)
    values (v_conversation.id, v_uid), (v_conversation.id, p_user_id);
  end if;
  return v_conversation;
end;
$$;

-- Consumer starts (or resumes) a chat with a business, optionally about a booking.
create function public.start_business_conversation(p_business_id uuid, p_booking_id uuid default null)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_conversation public.conversations;
begin
  if v_uid is null then
    raise exception 'Sign in to chat' using errcode = '42501';
  end if;
  if not private.is_business_active(p_business_id) then
    raise exception 'Business not found' using errcode = 'P0002';
  end if;
  if p_booking_id is not null and not exists (
    select 1 from public.bookings b
    where b.id = p_booking_id and b.consumer_id = v_uid and b.business_id = p_business_id
  ) then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  select c.* into v_conversation
  from public.conversations c
  where c.type = 'business' and c.business_id = p_business_id
    and c.booking_id is not distinct from p_booking_id
    and exists (select 1 from public.conversation_participants p where p.conversation_id = c.id and p.user_id = v_uid)
  limit 1;

  if not found then
    insert into public.conversations (type, business_id, booking_id, created_by)
    values ('business', p_business_id, p_booking_id, v_uid)
    returning * into v_conversation;
    insert into public.conversation_participants (conversation_id, user_id)
    values (v_conversation.id, v_uid);
  end if;
  return v_conversation;
end;
$$;

revoke execute on function public.start_direct_conversation from anon;
revoke execute on function public.start_business_conversation from anon;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Conversations are created by the RPCs and the group trigger.
create policy "conversations: participants read" on public.conversations
  for select to authenticated
  using ((select private.can_access_conversation(id)) or (select private.is_super_admin()));

create policy "participants: visible to the conversation" on public.conversation_participants
  for select to authenticated
  using ((select private.can_access_conversation(conversation_id)) or (select private.is_super_admin()));
-- Group members and business staff add their own row to track read state.
create policy "participants: join accessible conversations" on public.conversation_participants
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.can_access_conversation(conversation_id)));
create policy "participants: update own read state" on public.conversation_participants
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "messages: participants read" on public.messages
  for select to authenticated
  using ((select private.can_access_conversation(conversation_id)) or (select private.is_super_admin()));
create policy "messages: participants send" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select private.can_access_conversation(conversation_id))
    and (
      sender_business_id is null
      or (
        (select private.is_business_member(sender_business_id))
        and exists (select 1 from public.conversations c
                    where c.id = conversation_id and c.business_id = sender_business_id)
      )
    )
  );
create policy "messages: senders edit own" on public.messages
  for update to authenticated
  using (sender_id = (select auth.uid()))
  with check (sender_id = (select auth.uid()));

-- Realtime channel authorization (private channels: conversation:<uuid>).
create function private.realtime_conversation_topic_allowed(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_topic ~ '^conversation:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.can_access_conversation(split_part(p_topic, ':', 2)::uuid)
    else false
  end;
$$;

create policy "realtime: conversation participants receive" on realtime.messages
  for select to authenticated
  using ((select private.realtime_conversation_topic_allowed((select realtime.topic()))));
-- Lets participants send ephemeral events such as typing indicators.
create policy "realtime: conversation participants send" on realtime.messages
  for insert to authenticated
  with check ((select private.realtime_conversation_topic_allowed((select realtime.topic()))));
