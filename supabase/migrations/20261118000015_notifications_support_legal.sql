-- Notifications, push tokens, support tickets, legal documents.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null, -- booking_confirmed, new_message, review_reply, group_invite, offer, ...
  title text not null,
  body text,
  data jsonb not null default '{}', -- deep link target, ids
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique, -- Expo push token
  platform public.device_platform not null,
  device_name text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  subject text not null check (char_length(subject) between 3 and 140),
  status public.support_status not null default 'open',
  assigned_to uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create index support_tickets_status_idx on public.support_tickets (status, created_at);
create index support_tickets_business_idx on public.support_tickets (business_id);
create index support_tickets_booking_idx on public.support_tickets (booking_id);
create index support_tickets_assigned_idx on public.support_tickets (assigned_to);

create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function private.set_updated_at();

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  sender_id uuid references auth.users (id) on delete set null,
  is_staff_reply boolean not null default false, -- Moment support team
  body text not null check (char_length(body) <= 4000),
  attachments jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);
create index support_messages_sender_idx on public.support_messages (sender_id);

create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  type public.legal_document_type not null,
  version text not null,
  title text not null,
  body text not null, -- markdown
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (type, version)
);

create table public.legal_acceptances (
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.legal_documents (id) on delete restrict,
  accepted_at timestamptz not null default now(),
  primary key (user_id, document_id)
);
create index legal_acceptances_document_idx on public.legal_acceptances (document_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.legal_documents enable row level security;
alter table public.legal_acceptances enable row level security;

-- Notifications are created by backend code and triggers.
create policy "notifications: own read" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications: own mark read" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "notifications: own delete" on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "push_tokens: own" on public.push_tokens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "support_tickets: own, related business, admins read" on public.support_tickets
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (business_id is not null and (select private.is_business_member(business_id)))
    or (select private.is_super_admin())
  );
create policy "support_tickets: own create" on public.support_tickets
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'open' and assigned_to is null);
create policy "support_tickets: admins manage" on public.support_tickets
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create function private.can_access_ticket(tid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.support_tickets t
    where t.id = tid
      and (t.user_id = (select auth.uid())
           or (t.business_id is not null and private.is_business_member(t.business_id))
           or private.is_super_admin())
  );
$$;

create policy "support_messages: ticket parties read" on public.support_messages
  for select to authenticated
  using ((select private.can_access_ticket(ticket_id)));
create policy "support_messages: ticket parties send" on public.support_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select private.can_access_ticket(ticket_id))
    and (not is_staff_reply or (select private.is_super_admin()))
  );

create policy "legal_documents: public read published" on public.legal_documents
  for select to anon, authenticated
  using (published_at is not null and published_at <= now());
create policy "legal_documents: admins manage" on public.legal_documents
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create policy "legal_acceptances: own" on public.legal_acceptances
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()));
create policy "legal_acceptances: own accept" on public.legal_acceptances
  for insert to authenticated
  with check (user_id = (select auth.uid()));
