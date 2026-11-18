-- Businesses, private business data, locations, team members, staff, schedules.

-- ---------------------------------------------------------------------------
-- Businesses
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  kind public.business_kind not null,
  status public.business_status not null default 'draft',
  tagline text,
  description text,
  logo_url text,
  cover_url text,
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  email extensions.citext,
  website text,
  currency char(3) not null default 'PKR',
  timezone text not null default 'Asia/Karachi',
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  external_ref text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index businesses_status_idx on public.businesses (status);
create index businesses_created_by_idx on public.businesses (created_by);

create trigger businesses_updated_at before update on public.businesses
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Team membership
-- ---------------------------------------------------------------------------
create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.business_role not null,
  status public.member_status not null default 'invited',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
-- The hot path for every business RLS check.
create index business_members_user_active_idx on public.business_members (user_id, business_id)
  where status = 'active';
create index business_members_invited_by_idx on public.business_members (invited_by);

create trigger business_members_updated_at before update on public.business_members
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
create function private.is_business_member(bid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = bid and m.user_id = (select auth.uid()) and m.status = 'active'
  );
$$;

create function private.has_business_role(bid uuid, roles public.business_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = bid and m.user_id = (select auth.uid())
      and m.status = 'active' and m.role = any (roles)
  );
$$;

-- Shorthands used throughout the policies.
create function private.is_business_manager(bid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_business_role(bid, array['owner', 'manager']::public.business_role[]);
$$;

create function private.is_business_owner(bid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_business_role(bid, array['owner']::public.business_role[]);
$$;

create function private.is_business_active(bid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.businesses b where b.id = bid and b.status = 'active');
$$;

-- ---------------------------------------------------------------------------
-- Business guards
-- ---------------------------------------------------------------------------
-- Only super admins change status or rating aggregates (triggers bypass by
-- running as definer with no auth.uid()).
create function private.businesses_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_client_request() then
    if new.status is distinct from old.status then
      -- Owners may submit a draft for review, nothing else.
      if not (old.status = 'draft' and new.status = 'pending_review') then
        raise exception 'Only Moment admins can change business status' using errcode = '42501';
      end if;
    end if;
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

create trigger businesses_guard before update on public.businesses
  for each row execute function private.businesses_guard();

-- New businesses always start as draft, owned by their creator.
create function private.businesses_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_client_request() then
    new.status := 'draft';
    new.created_by := (select auth.uid());
    new.rating_avg := 0;
    new.rating_count := 0;
  end if;
  return new;
end;
$$;

create trigger businesses_before_insert before insert on public.businesses
  for each row execute function private.businesses_before_insert();

create function private.businesses_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.business_members (business_id, user_id, role, status)
    values (new.id, new.created_by, 'owner', 'active')
    on conflict do nothing;
  end if;
  insert into public.business_private (business_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

-- A business must always keep at least one active owner.
create function private.ensure_business_has_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  bid uuid := coalesce(old.business_id, new.business_id);
begin
  if exists (select 1 from public.businesses b where b.id = bid)
     and not exists (
       select 1 from public.business_members m
       where m.business_id = bid and m.role = 'owner' and m.status = 'active'
     ) then
    raise exception 'A business must keep at least one active owner' using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger business_members_keep_owner
  after update or delete on public.business_members
  deferrable initially deferred
  for each row execute function private.ensure_business_has_owner();

-- ---------------------------------------------------------------------------
-- Private business data (owner only)
-- ---------------------------------------------------------------------------
create table public.business_private (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  legal_name text,
  tax_id text, -- NTN in Pakistan
  contact_name text,
  contact_phone text check (contact_phone is null or contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  contact_email extensions.citext,
  payout_model public.payout_model, -- null = platform default (platform_settings)
  commission_bps integer check (commission_bps between 0 and 10000), -- null = platform default
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger business_private_updated_at before update on public.business_private
  for each row execute function private.set_updated_at();

create trigger businesses_after_insert after insert on public.businesses
  for each row execute function private.businesses_after_insert();

-- Commission and verification are set by Moment, not the business.
create function private.business_private_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_client_request() then
    new.commission_bps := old.commission_bps;
    new.verified_at := old.verified_at;
  end if;
  return new;
end;
$$;

create trigger business_private_guard before update on public.business_private
  for each row execute function private.business_private_guard();

-- ---------------------------------------------------------------------------
-- Locations
-- ---------------------------------------------------------------------------
create table public.business_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  address_line1 text not null,
  address_line2 text,
  area text,
  city text not null,
  province text,
  postal_code text,
  country_code char(2) not null default 'PK',
  geo extensions.geography(point, 4326),
  timezone text not null default 'Asia/Karachi',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);
create index business_locations_business_idx on public.business_locations (business_id);
create index business_locations_city_idx on public.business_locations (city);
create index business_locations_geo_idx on public.business_locations using gist (geo);

create trigger business_locations_updated_at before update on public.business_locations
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Staff and hosts
-- ---------------------------------------------------------------------------
create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  display_name text not null,
  title text,
  bio text,
  avatar_url text,
  languages text[] not null default '{}',
  is_host boolean not null default false,
  is_bookable boolean not null default false,
  is_active boolean not null default true,
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);
create index staff_members_business_idx on public.staff_members (business_id);
create index staff_members_user_idx on public.staff_members (user_id);
create index staff_members_hosts_idx on public.staff_members (rating_avg desc)
  where is_host and is_active;

create trigger staff_members_updated_at before update on public.staff_members
  for each row execute function private.set_updated_at();

create table public.staff_schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  staff_id uuid not null,
  location_id uuid,
  weekday smallint not null check (weekday between 1 and 7), -- ISO: 1 = Monday
  start_time time not null,
  end_time time not null,
  valid_from date,
  valid_until date,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  foreign key (business_id, staff_id) references public.staff_members (business_id, id) on delete cascade,
  foreign key (business_id, location_id) references public.business_locations (business_id, id)
);
create index staff_schedules_business_idx on public.staff_schedules (business_id);
create index staff_schedules_staff_idx on public.staff_schedules (staff_id, weekday);
create index staff_schedules_location_idx on public.staff_schedules (location_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_private enable row level security;
alter table public.business_locations enable row level security;
alter table public.staff_members enable row level security;
alter table public.staff_schedules enable row level security;

-- businesses
create policy "businesses: public read active" on public.businesses
  for select to anon, authenticated
  using (status = 'active');
create policy "businesses: members and admins read" on public.businesses
  for select to authenticated
  using ((select private.is_business_member(id)) or (select private.is_super_admin()));
create policy "businesses: signed-in users create" on public.businesses
  for insert to authenticated
  with check (true); -- trigger forces draft status and ownership
create policy "businesses: owners and admins update" on public.businesses
  for update to authenticated
  using ((select private.is_business_owner(id)) or (select private.is_super_admin()))
  with check ((select private.is_business_owner(id)) or (select private.is_super_admin()));
create policy "businesses: admins delete" on public.businesses
  for delete to authenticated
  using ((select private.is_super_admin()));

-- business_members
create policy "members: read own, team, or admin" on public.business_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_business_member(business_id))
    or (select private.is_super_admin())
  );
create policy "members: owners and admins manage" on public.business_members
  for all to authenticated
  using ((select private.is_business_owner(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_owner(business_id)) or (select private.is_super_admin()));
-- Invitees accept their own invitation (role cannot change: see guard).
create policy "members: accept own invitation" on public.business_members
  for update to authenticated
  using (user_id = (select auth.uid()) and status = 'invited')
  with check (user_id = (select auth.uid()) and status = 'active');

create function private.business_members_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_client_request()
     and not private.is_business_owner(old.business_id)
     and (new.role is distinct from old.role or new.business_id is distinct from old.business_id
          or new.user_id is distinct from old.user_id) then
    raise exception 'Only owners can change team roles' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger business_members_guard before update on public.business_members
  for each row execute function private.business_members_guard();

-- business_private
create policy "business_private: owners and admins" on public.business_private
  for select to authenticated
  using ((select private.is_business_owner(business_id)) or (select private.is_super_admin()));
create policy "business_private: owners and admins update" on public.business_private
  for update to authenticated
  using ((select private.is_business_owner(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_owner(business_id)) or (select private.is_super_admin()));

-- business_locations
create policy "locations: public read for active businesses" on public.business_locations
  for select to anon, authenticated
  using ((select private.is_business_active(business_id)));
create policy "locations: members and admins read" on public.business_locations
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "locations: owners and admins manage" on public.business_locations
  for all to authenticated
  using ((select private.is_business_owner(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_owner(business_id)) or (select private.is_super_admin()));

-- staff_members: public hosts and bookable staff are visible to everyone
create policy "staff: public read hosts and bookable staff" on public.staff_members
  for select to anon, authenticated
  using (is_active and (is_host or is_bookable) and (select private.is_business_active(business_id)));
create policy "staff: members and admins read" on public.staff_members
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "staff: managers and admins manage" on public.staff_members
  for all to authenticated
  using ((select private.is_business_manager(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_manager(business_id)) or (select private.is_super_admin()));

-- staff_schedules
create policy "schedules: members and admins read" on public.staff_schedules
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "schedules: managers and admins manage" on public.staff_schedules
  for all to authenticated
  using ((select private.is_business_manager(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_manager(business_id)) or (select private.is_super_admin()));
