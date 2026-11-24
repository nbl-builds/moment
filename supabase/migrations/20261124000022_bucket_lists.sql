-- Named bucket lists (Figma "Bucket List" 22:2329 ... 25:1723). A user keeps
-- several lists ("I love nature", ...); the same listing can sit in more than
-- one. Items move from the flat per-user list into a list.

create table public.bucket_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  -- For "Share a link" (moment://bucket-list/<token>); read access by token comes later.
  share_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target of the items' composite FK, so an item can only be in its owner's list.
  unique (id, user_id)
);
create index bucket_lists_user_idx on public.bucket_lists (user_id, created_at desc);

create trigger bucket_lists_updated_at before update on public.bucket_lists
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Items join a list
-- ---------------------------------------------------------------------------
alter table public.bucket_list_items add column bucket_list_id uuid;

-- Backfill: everyone with saved items gets "My bucket list" holding them.
insert into public.bucket_lists (user_id, name, created_at)
select user_id, 'My bucket list', min(created_at)
from public.bucket_list_items
group by user_id;

update public.bucket_list_items i
set bucket_list_id = l.id
from public.bucket_lists l
where l.user_id = i.user_id and i.bucket_list_id is null;

alter table public.bucket_list_items
  alter column bucket_list_id set not null,
  add constraint bucket_list_items_list_fk foreign key (bucket_list_id, user_id)
    references public.bucket_lists (id, user_id) on delete cascade;

-- Unique per list now, not per user.
drop index public.bucket_list_listing_idx;
drop index public.bucket_list_business_idx;
create unique index bucket_list_items_list_listing_idx on public.bucket_list_items (bucket_list_id, listing_id) where listing_id is not null;
create unique index bucket_list_items_list_business_idx on public.bucket_list_items (bucket_list_id, business_id) where business_id is not null;
-- The FK's columns, for list deletes and the list screen.
create index bucket_list_items_list_idx on public.bucket_list_items (bucket_list_id, user_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS: owner only (admins may read, as for items)
-- ---------------------------------------------------------------------------
alter table public.bucket_lists enable row level security;

create policy "bucket_lists: own" on public.bucket_lists
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "bucket_lists: admins read" on public.bucket_lists
  for select to authenticated
  using ((select private.is_super_admin()));
