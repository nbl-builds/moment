-- Bookings, items, status history, appointment availability and booking RPCs.

create function private.generate_booking_code()
returns text
language sql
volatile
set search_path = ''
as $$
  -- Unambiguous alphabet (no 0/O, 1/I/L), e.g. MT-7KQ4XD.
  select 'MT-' || string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (floor(random() * 31) + 1)::int, 1), '')
  from generate_series(1, 6);
$$;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default private.generate_booking_code(),
  business_id uuid not null references public.businesses (id) on delete restrict,
  consumer_id uuid not null references public.profiles (id) on delete restrict,
  listing_id uuid not null,
  slot_id uuid,
  staff_id uuid,
  location_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  during tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  guest_count integer not null default 1 check (guest_count > 0),
  status public.booking_status not null default 'pending',
  payment_status public.booking_payment_status not null default 'unpaid',
  contact_name text,
  contact_phone text,
  contact_email text,
  notes text check (char_length(notes) <= 1000),
  subtotal_amount integer not null check (subtotal_amount >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  fee_amount integer not null default 0 check (fee_amount >= 0),
  tax_amount integer not null default 0 check (tax_amount >= 0),
  total_amount integer not null check (total_amount >= 0),
  currency char(3) not null default 'PKR',
  coupon_id uuid,     -- FK added with coupons
  membership_id uuid, -- FK added with memberships
  group_id uuid,      -- FK added with groups
  source public.booking_source not null default 'app',
  idempotency_key text,
  external_ref text,
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (total_amount = subtotal_amount - discount_amount + fee_amount + tax_amount),
  unique (business_id, id),
  unique (consumer_id, idempotency_key),
  foreign key (business_id, listing_id) references public.listings (business_id, id),
  foreign key (business_id, slot_id) references public.slots (business_id, id),
  foreign key (business_id, staff_id) references public.staff_members (business_id, id),
  foreign key (business_id, location_id) references public.business_locations (business_id, id),
  -- A staff member can never hold two overlapping live appointments.
  constraint bookings_no_staff_overlap exclude using gist (staff_id with =, during with &&)
    where (slot_id is null and staff_id is not null and status in ('pending', 'confirmed'))
);
create index bookings_consumer_idx on public.bookings (consumer_id, starts_at desc);
create index bookings_business_idx on public.bookings (business_id, starts_at);
create index bookings_business_status_idx on public.bookings (business_id, status);
create index bookings_listing_idx on public.bookings (listing_id);
create index bookings_slot_idx on public.bookings (slot_id);
create index bookings_staff_idx on public.bookings (staff_id, starts_at);
create index bookings_location_idx on public.bookings (location_id);
create index bookings_coupon_idx on public.bookings (coupon_id);
create index bookings_membership_idx on public.bookings (membership_id);
create index bookings_group_idx on public.bookings (group_id);
create index bookings_cancelled_by_idx on public.bookings (cancelled_by);

create trigger bookings_updated_at before update on public.bookings
  for each row execute function private.set_updated_at();

create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  booking_id uuid not null,
  option_id uuid,
  name text not null, -- snapshot of the option name
  quantity integer not null check (quantity > 0),
  unit_amount integer not null check (unit_amount >= 0),
  total_amount integer not null check (total_amount >= 0),
  foreign key (business_id, booking_id) references public.bookings (business_id, id) on delete cascade,
  foreign key (business_id, option_id) references public.listing_options (business_id, id) on delete set null (option_id)
);
create index booking_items_booking_idx on public.booking_items (booking_id);
create index booking_items_business_idx on public.booking_items (business_id);
create index booking_items_option_idx on public.booking_items (option_id);

create table public.booking_events (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  booking_id uuid not null,
  actor_id uuid references auth.users (id) on delete set null,
  from_status public.booking_status,
  to_status public.booking_status not null,
  note text,
  created_at timestamptz not null default now(),
  foreign key (business_id, booking_id) references public.bookings (business_id, id) on delete cascade
);
create index booking_events_booking_idx on public.booking_events (booking_id, created_at);
create index booking_events_business_idx on public.booking_events (business_id);
create index booking_events_actor_idx on public.booking_events (actor_id);

-- ---------------------------------------------------------------------------
-- Booking triggers
-- ---------------------------------------------------------------------------
create function private.recount_slot(p_slot_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.slots s
  set seats_booked = c.seats,
      status = case when s.status = 'cancelled' then 'cancelled'::public.slot_status
                    when c.seats >= s.capacity then 'full'::public.slot_status
                    else 'open'::public.slot_status end
  from (
    select coalesce(sum(b.guest_count), 0)::int as seats
    from public.bookings b
    where b.slot_id = p_slot_id and b.status in ('pending', 'confirmed', 'completed', 'no_show')
  ) c
  where s.id = p_slot_id;
$$;

create function private.refresh_listing_stats(p_listing_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.listings l
  set booking_count = s.bookings,
      popularity_score = round((l.rating_avg * ln(l.rating_count + 1) + ln(s.bookings + 1))::numeric, 4)
  from (
    select count(*)::int as bookings
    from public.bookings b
    where b.listing_id = p_listing_id and b.status in ('confirmed', 'completed')
  ) s
  where l.id = p_listing_id;
$$;

create function private.bookings_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    case new.status
      when 'confirmed' then new.confirmed_at := coalesce(new.confirmed_at, now());
      when 'completed' then new.completed_at := coalesce(new.completed_at, now());
      when 'cancelled_by_consumer', 'cancelled_by_business' then
        new.cancelled_at := coalesce(new.cancelled_at, now());
        new.cancelled_by := coalesce(new.cancelled_by, (select auth.uid()));
      else null;
    end case;
  end if;
  return new;
end;
$$;

create trigger bookings_before_write before insert or update on public.bookings
  for each row execute function private.bookings_before_write();

create function private.bookings_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_events (business_id, booking_id, actor_id, from_status, to_status)
    values (new.business_id, new.id, (select auth.uid()), null, new.status);
  elsif new.status is distinct from old.status then
    insert into public.booking_events (business_id, booking_id, actor_id, from_status, to_status, note)
    values (new.business_id, new.id, (select auth.uid()), old.status, new.status, new.cancellation_reason);
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.slot_id is not null then
    perform private.recount_slot(old.slot_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.slot_id is not null
     and (tg_op = 'INSERT' or new.slot_id is distinct from old.slot_id
          or new.status is distinct from old.status or new.guest_count is distinct from old.guest_count) then
    perform private.recount_slot(new.slot_id);
  end if;

  if tg_op = 'INSERT' or new.status is distinct from old.status then
    perform private.refresh_listing_stats(new.listing_id);
  end if;
  return null;
end;
$$;

-- Deletes are not expected (bookings are cancelled, not removed); only
-- insert/update are tracked so events are never written for a vanished row.
create trigger bookings_after_write after insert or update on public.bookings
  for each row execute function private.bookings_after_write();

-- ---------------------------------------------------------------------------
-- Appointment availability
-- ---------------------------------------------------------------------------
-- Free start times for an appointment-mode listing on a local date.
create function public.get_available_times(
  p_listing_id uuid,
  p_date date,
  p_staff_id uuid default null,
  p_option_id uuid default null
)
returns table (staff_id uuid, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with l as (
    select l.id, l.business_id, b.timezone, l.slot_interval_minutes, l.buffer_minutes,
           coalesce(o.duration_minutes, l.duration_minutes) as duration
    from public.listings l
    join public.businesses b on b.id = l.business_id
    left join public.listing_options o on o.id = p_option_id and o.listing_id = l.id and o.is_active
    where l.id = p_listing_id
      and l.booking_mode = 'appointment'
      and (private.is_listing_public(l.id) or private.is_business_member(l.business_id))
  ),
  shifts as (
    select s.id as staff_id, sch.start_time, sch.end_time
    from l
    join public.listing_staff ls on ls.listing_id = l.id
    join public.staff_members s on s.id = ls.staff_id and s.is_active and s.is_bookable
    join public.staff_schedules sch on sch.staff_id = s.id
      and sch.weekday = extract(isodow from p_date)::smallint
      and (sch.valid_from is null or sch.valid_from <= p_date)
      and (sch.valid_until is null or sch.valid_until >= p_date)
    where p_staff_id is null or s.id = p_staff_id
  ),
  candidates as (
    select sh.staff_id, t as starts_at, t + make_interval(mins => l.duration) as ends_at,
           l.buffer_minutes, l.business_id, l.id as listing_id
    from l
    cross join shifts sh
    cross join lateral generate_series(
      (p_date + sh.start_time) at time zone l.timezone,
      ((p_date + sh.end_time) at time zone l.timezone) - make_interval(mins => l.duration),
      make_interval(mins => l.slot_interval_minutes)
    ) as t
  )
  select c.staff_id, c.starts_at, c.ends_at
  from candidates c
  where c.starts_at > now()
    and not exists (
      select 1 from public.bookings bk
      where bk.staff_id = c.staff_id
        and bk.slot_id is null
        and bk.status in ('pending', 'confirmed')
        and bk.during && tstzrange(c.starts_at, c.ends_at + make_interval(mins => c.buffer_minutes), '[)')
    )
    and not exists (
      select 1 from public.availability_exceptions e
      where e.business_id = c.business_id
        and tstzrange(e.starts_at, e.ends_at) && tstzrange(c.starts_at, c.ends_at)
        and (e.scope = 'business'
             or (e.scope = 'listing' and e.listing_id = c.listing_id)
             or (e.scope = 'staff' and e.staff_id = c.staff_id))
    )
  order by c.starts_at, c.staff_id;
$$;

-- ---------------------------------------------------------------------------
-- Status changes
-- ---------------------------------------------------------------------------
create function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings
  where id = p_booking_id and consumer_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if v_booking.status not in ('pending', 'confirmed') or v_booking.starts_at <= now() then
    raise exception 'This booking can no longer be cancelled' using errcode = '22023';
  end if;

  update public.bookings
  set status = 'cancelled_by_consumer', cancellation_reason = p_reason
  where id = p_booking_id
  returning * into v_booking;
  return v_booking;
end;
$$;

create function public.update_booking_status(
  p_booking_id uuid,
  p_status public.booking_status,
  p_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or not (private.is_business_member(v_booking.business_id) or private.is_super_admin()) then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  if not (
    (v_booking.status = 'pending' and p_status in ('confirmed', 'cancelled_by_business'))
    or (v_booking.status = 'confirmed' and p_status = 'cancelled_by_business')
    or (v_booking.status = 'confirmed' and p_status in ('completed', 'no_show') and v_booking.starts_at <= now())
  ) then
    raise exception 'Cannot change booking from % to %', v_booking.status, p_status using errcode = '22023';
  end if;

  update public.bookings
  set status = p_status,
      cancellation_reason = case when p_status = 'cancelled_by_business' then p_reason else cancellation_reason end
  where id = p_booking_id
  returning * into v_booking;
  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.booking_events enable row level security;

-- Writes go through the RPCs above; only admins edit rows directly.
create policy "bookings: consumer, business and admins read" on public.bookings
  for select to authenticated
  using (
    consumer_id = (select auth.uid())
    or (select private.is_business_member(business_id))
    or (select private.is_super_admin())
  );
create policy "bookings: admins update" on public.bookings
  for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create function private.can_read_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
    where b.id = p_booking_id
      and (b.consumer_id = (select auth.uid()) or private.is_business_member(b.business_id) or private.is_super_admin())
  );
$$;

create policy "booking_items: readable with the booking" on public.booking_items
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.can_read_booking(booking_id)));

create policy "booking_events: readable with the booking" on public.booking_events
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.can_read_booking(booking_id)));

revoke execute on function public.cancel_booking from anon;
revoke execute on function public.update_booking_status from anon;
