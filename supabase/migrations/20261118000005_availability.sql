-- Availability: recurring rules, closures, materialised slots, slot generator.
-- Appointment-mode availability (get_available_times) lives with bookings.

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  listing_id uuid not null,
  staff_id uuid, -- host running these sessions
  weekdays smallint[] not null check (weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[] and cardinality(weekdays) > 0),
  start_time time not null,
  capacity integer not null check (capacity > 0),
  valid_from date not null default current_date,
  valid_until date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from),
  foreign key (business_id, listing_id) references public.listings (business_id, id) on delete cascade,
  foreign key (business_id, staff_id) references public.staff_members (business_id, id)
);
create index availability_rules_business_idx on public.availability_rules (business_id);
create index availability_rules_listing_idx on public.availability_rules (listing_id);
create index availability_rules_staff_idx on public.availability_rules (staff_id);

create trigger availability_rules_updated_at before update on public.availability_rules
  for each row execute function private.set_updated_at();

-- Closures: holidays, maintenance, staff leave. They block slots and appointment times.
create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  scope public.exception_scope not null,
  listing_id uuid,
  staff_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (
    (scope = 'business' and listing_id is null and staff_id is null)
    or (scope = 'listing' and listing_id is not null and staff_id is null)
    or (scope = 'staff' and staff_id is not null and listing_id is null)
  ),
  foreign key (business_id, listing_id) references public.listings (business_id, id) on delete cascade,
  foreign key (business_id, staff_id) references public.staff_members (business_id, id) on delete cascade
);
create index availability_exceptions_business_idx on public.availability_exceptions (business_id, starts_at);
create index availability_exceptions_listing_idx on public.availability_exceptions (listing_id);
create index availability_exceptions_staff_idx on public.availability_exceptions (staff_id);
create index availability_exceptions_created_by_idx on public.availability_exceptions (created_by);

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  listing_id uuid not null,
  rule_id uuid references public.availability_rules (id) on delete set null,
  staff_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  seats_booked integer not null default 0 check (seats_booked >= 0),
  status public.slot_status not null default 'open',
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (listing_id, starts_at),
  unique (business_id, id),
  foreign key (business_id, listing_id) references public.listings (business_id, id) on delete cascade,
  foreign key (business_id, staff_id) references public.staff_members (business_id, id)
);
create index slots_open_idx on public.slots (listing_id, starts_at) where status = 'open';
create index slots_business_idx on public.slots (business_id, starts_at);
create index slots_rule_idx on public.slots (rule_id);
create index slots_staff_idx on public.slots (staff_id);

create trigger slots_updated_at before update on public.slots
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Slot generation
-- ---------------------------------------------------------------------------
-- Creates slots from active rules for the next p_days days, skipping closures.
-- Idempotent: existing slots are left alone.
create function private.generate_slots(p_days integer default 90, p_listing_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted integer;
begin
  with candidates as (
    select
      r.id as rule_id, r.business_id, r.listing_id, r.staff_id, r.capacity,
      ((d::date + r.start_time) at time zone b.timezone) as starts_at,
      ((d::date + r.start_time) at time zone b.timezone) + make_interval(mins => l.duration_minutes) as ends_at
    from public.availability_rules r
    join public.listings l on l.id = r.listing_id
    join public.businesses b on b.id = r.business_id
    cross join generate_series(
      greatest(r.valid_from, (now() at time zone b.timezone)::date),
      least(coalesce(r.valid_until, 'infinity'::date), (now() at time zone b.timezone)::date + p_days),
      interval '1 day'
    ) as d
    where r.is_active
      and l.booking_mode = 'slot'
      and l.status <> 'archived'
      and (p_listing_id is null or r.listing_id = p_listing_id)
      and extract(isodow from d)::smallint = any (r.weekdays)
  )
  insert into public.slots (business_id, listing_id, rule_id, staff_id, starts_at, ends_at, capacity)
  select c.business_id, c.listing_id, c.rule_id, c.staff_id, c.starts_at, c.ends_at, c.capacity
  from candidates c
  where c.starts_at > now()
    and not exists (
      select 1 from public.availability_exceptions e
      where e.business_id = c.business_id
        and tstzrange(e.starts_at, e.ends_at) && tstzrange(c.starts_at, c.ends_at)
        and (e.scope = 'business'
             or (e.scope = 'listing' and e.listing_id = c.listing_id)
             or (e.scope = 'staff' and e.staff_id = c.staff_id))
    )
  on conflict (listing_id, starts_at) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- Rule changes: drop future unbooked slots from the old rule, then regenerate.
create function private.availability_rules_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from public.slots s
    where s.rule_id = old.id and s.starts_at > now() and s.seats_booked = 0;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform private.generate_slots(90, new.listing_id);
  end if;
  return null;
end;
$$;

create trigger availability_rules_changed
  after insert or update or delete on public.availability_rules
  for each row execute function private.availability_rules_changed();

-- New closures cancel overlapping unbooked slots. Booked slots stay for the
-- business to handle (contact guests, reschedule).
create function private.availability_exception_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.slots s
  set status = 'cancelled'
  where s.business_id = new.business_id
    and s.seats_booked = 0
    and s.status <> 'cancelled'
    and tstzrange(s.starts_at, s.ends_at) && tstzrange(new.starts_at, new.ends_at)
    and (new.scope = 'business'
         or (new.scope = 'listing' and s.listing_id = new.listing_id)
         or (new.scope = 'staff' and s.staff_id = new.staff_id));
  return null;
end;
$$;

create trigger availability_exception_added
  after insert on public.availability_exceptions
  for each row execute function private.availability_exception_added();

-- Nightly at 02:00 Pakistan time (21:00 UTC).
select cron.schedule('generate-slots', '0 21 * * *', $$select private.generate_slots(90)$$);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.slots enable row level security;

create policy "availability_rules: members and admins read" on public.availability_rules
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "availability_rules: managers and admins manage" on public.availability_rules
  for all to authenticated
  using ((select private.is_business_manager(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_manager(business_id)) or (select private.is_super_admin()));

create policy "availability_exceptions: members and admins read" on public.availability_exceptions
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "availability_exceptions: managers and admins manage" on public.availability_exceptions
  for all to authenticated
  using ((select private.is_business_manager(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_manager(business_id)) or (select private.is_super_admin()));

create policy "slots: public read upcoming" on public.slots
  for select to anon, authenticated
  using (status <> 'cancelled' and starts_at > now() and (select private.is_listing_public(listing_id)));
create policy "slots: members and admins read" on public.slots
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "slots: managers and admins manage" on public.slots
  for all to authenticated
  using ((select private.is_business_manager(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_manager(business_id)) or (select private.is_super_admin()));
