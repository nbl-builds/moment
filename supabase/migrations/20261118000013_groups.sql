-- Groups (group travel) and group matching.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 1000),
  cover_url text,
  destination_city text,
  destination_geo extensions.geography(point, 4326),
  start_date date,
  end_date date,
  visibility public.group_visibility not null default 'private',
  is_open_to_match boolean not null default false,
  max_members integer not null default 12 check (max_members between 2 and 100),
  interest_tag_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (not is_open_to_match or visibility = 'public')
);
create index groups_owner_idx on public.groups (owner_id);
create index groups_match_idx on public.groups (destination_city, start_date) where visibility = 'public' and is_open_to_match;
create index groups_destination_geo_idx on public.groups using gist (destination_geo);

create trigger groups_updated_at before update on public.groups
  for each row execute function private.set_updated_at();

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.group_role not null default 'member',
  status public.group_member_status not null,
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id, status);
create index group_members_invited_by_idx on public.group_members (invited_by);

create trigger group_members_updated_at before update on public.group_members
  for each row execute function private.set_updated_at();

alter table public.bookings
  add constraint bookings_group_fk foreign key (group_id) references public.groups (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function private.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = gid and m.user_id = (select auth.uid()) and m.status = 'active'
  );
$$;

create function private.is_group_admin(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = gid and m.user_id = (select auth.uid())
      and m.status = 'active' and m.role in ('owner', 'admin')
  );
$$;

-- Invited or requested users can see the group they are dealing with.
create function private.has_group_relation(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = gid and m.user_id = (select auth.uid()) and m.status <> 'left'
  );
$$;

create function private.is_group_public(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.groups g where g.id = gid and g.visibility = 'public');
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function private.groups_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_members (group_id, user_id, role, status, joined_at)
  values (new.id, new.owner_id, 'owner', 'active', now())
  on conflict do nothing;
  return null;
end;
$$;

create trigger groups_after_insert after insert on public.groups
  for each row execute function private.groups_after_insert();

create function private.group_has_space(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select count(*) from public.group_members m where m.group_id = gid and m.status = 'active')
       < (select g.max_members from public.groups g where g.id = gid);
$$;

-- Membership rules: capacity, who can change roles, valid status moves.
create function private.group_members_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_is_admin boolean;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    if not private.group_has_space(new.group_id) then
      raise exception 'This group is full' using errcode = '23514';
    end if;
    new.joined_at := coalesce(new.joined_at, now());
  end if;

  if not private.is_client_request() then
    return new;
  end if;

  v_is_admin := private.is_group_admin(new.group_id);

  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role and not v_is_admin then
      raise exception 'Only group admins can change roles' using errcode = '42501';
    end if;
    if old.role = 'owner' and new.role <> 'owner' then
      raise exception 'Transfer ownership before stepping down' using errcode = '42501';
    end if;
    if not v_is_admin and new.user_id = v_uid and not (
      (old.status = 'invited' and new.status in ('active', 'left'))
      or new.status = 'left'
      or new.status = old.status
    ) then
      raise exception 'You cannot make that change' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger group_members_guard before insert or update on public.group_members
  for each row execute function private.group_members_guard();

-- ---------------------------------------------------------------------------
-- Group Match
-- ---------------------------------------------------------------------------
-- Public groups open to matching, ranked by how many active members share the
-- caller's personality badge.
create function public.find_matching_groups(
  p_city text default null,
  p_start date default null,
  p_end date default null,
  p_limit integer default 20
)
returns setof public.groups
language sql
stable
security invoker
set search_path = ''
as $$
  select g.*
  from public.groups g
  left join lateral (
    select count(*) as shared
    from public.group_members m
    join public.profiles p on p.id = m.user_id
    where m.group_id = g.id and m.status = 'active'
      and p.personality_badge_id is not null
      and p.personality_badge_id = (select personality_badge_id from public.profiles where id = (select auth.uid()))
  ) s on true
  where g.visibility = 'public'
    and g.is_open_to_match
    and (g.end_date is null or g.end_date >= current_date)
    and (p_city is null or g.destination_city = p_city)
    and (p_start is null or g.end_date is null or g.end_date >= p_start)
    and (p_end is null or g.start_date is null or g.start_date <= p_end)
    and not private.has_group_relation(g.id)
  order by s.shared desc, g.start_date nulls last
  limit least(greatest(p_limit, 1), 100);
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "groups: read public, own or admin" on public.groups
  for select to authenticated
  using (
    visibility = 'public'
    or owner_id = (select auth.uid())
    or (select private.has_group_relation(id))
    or (select private.is_super_admin())
  );
create policy "groups: create own" on public.groups
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "groups: group admins update" on public.groups
  for update to authenticated
  using ((select private.is_group_admin(id)) or (select private.is_super_admin()))
  with check ((select private.is_group_admin(id)) or (select private.is_super_admin()));
create policy "groups: owner or admin delete" on public.groups
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_super_admin()));

create policy "group_members: read public groups, own groups, or admin" on public.group_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_group_member(group_id))
    or (select private.is_group_public(group_id))
    or (select private.is_super_admin())
  );
create policy "group_members: request to join public groups" on public.group_members
  for insert to authenticated
  with check (
    user_id = (select auth.uid()) and status = 'requested' and role = 'member'
    and (select private.is_group_public(group_id))
  );
create policy "group_members: group admins invite" on public.group_members
  for insert to authenticated
  with check (
    (select private.is_group_admin(group_id)) and status = 'invited' and role <> 'owner'
    and invited_by = (select auth.uid())
  );
create policy "group_members: self or group admins update" on public.group_members
  for update to authenticated
  using (user_id = (select auth.uid()) or (select private.is_group_admin(group_id)) or (select private.is_super_admin()))
  with check (user_id = (select auth.uid()) or (select private.is_group_admin(group_id)) or (select private.is_super_admin()));
create policy "group_members: self or group admins remove" on public.group_members
  for delete to authenticated
  using (
    (user_id = (select auth.uid()) and role <> 'owner')
    or ((select private.is_group_admin(group_id)) and role <> 'owner')
    or (select private.is_super_admin())
  );
