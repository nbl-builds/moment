-- Booking Status screens: unread chat counts per business for the Bookings
-- tab, and a private per-user Realtime topic (`user:<uid>`) that carries
-- booking status changes and new chat messages, so the tab badge, the
-- Bookings list and Reservation details update live.

-- ---------------------------------------------------------------------------
-- Unread messages from each business, for the signed-in consumer
-- ---------------------------------------------------------------------------
-- Messages the user didn't send, after their last read, in business
-- conversations they take part in. One row per business with a conversation.
create function public.my_business_unread()
returns table (business_id uuid, conversation_id uuid, unread integer, last_message_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.business_id, c.id, (
    select count(*)::integer from public.messages m
    where m.conversation_id = c.id
      and m.deleted_at is null
      and m.sender_id is distinct from p.user_id
      and m.created_at > coalesce(p.last_read_at, '-infinity'::timestamptz)
  ), c.last_message_at
  from public.conversations c
  join public.conversation_participants p on p.conversation_id = c.id and p.user_id = (select auth.uid())
  where c.type = 'business';
$$;

comment on function public.my_business_unread() is
  'Bookings tab: unread messages per business conversation for the signed-in user.';

revoke execute on function public.my_business_unread() from anon;

-- ---------------------------------------------------------------------------
-- Per-user Realtime topic
-- ---------------------------------------------------------------------------
create function private.realtime_user_topic_allowed(p_topic text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_topic = 'user:' || (select auth.uid())::text;
$$;

create policy "realtime: users receive their own topic" on realtime.messages
  for select to authenticated
  using ((select private.realtime_user_topic_allowed((select realtime.topic()))));

-- Booking status, time or payment changes reach the consumer.
create function private.bookings_broadcast_to_consumer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.status is not distinct from old.status
     and new.starts_at is not distinct from old.starts_at
     and new.payment_status is not distinct from old.payment_status then
    return null;
  end if;
  perform realtime.send(
    jsonb_build_object('booking_id', new.id, 'business_id', new.business_id, 'status', new.status, 'starts_at', new.starts_at),
    'booking', 'user:' || new.consumer_id::text, true
  );
  return null;
end;
$$;

create trigger bookings_broadcast_to_consumer after insert or update on public.bookings
  for each row execute function private.bookings_broadcast_to_consumer();

-- A new message tells every other participant (unread badges).
create function private.messages_notify_participants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business uuid;
  v_user uuid;
begin
  select business_id into v_business from public.conversations where id = new.conversation_id;
  for v_user in
    select p.user_id from public.conversation_participants p
    where p.conversation_id = new.conversation_id and p.user_id is distinct from new.sender_id
  loop
    perform realtime.send(
      jsonb_build_object('conversation_id', new.conversation_id, 'business_id', v_business, 'message_id', new.id),
      'message', 'user:' || v_user::text, true
    );
  end loop;
  return null;
end;
$$;

create trigger messages_notify_participants after insert on public.messages
  for each row execute function private.messages_notify_participants();
