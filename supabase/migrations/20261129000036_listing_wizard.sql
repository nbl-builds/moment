-- Create New Listing wizard (business portal).
--
-- 1. listings: guest requirements, private group size, booking cut-off,
--    large-group and early-bird discounts, meeting address, wizard progress.
-- 2. Offer discounts priced by the server: quote_booking (new p_starts_at for
--    early-bird) and create_booking store them on the booking
--    (offer_discount_amount is part of discount_amount).
-- 3. Booking cut-off: sessions and appointment times inside the cut-off are
--    hidden from guests and refused by create_booking.
-- 4. Appointment times also respect the business's opening hours.
-- 5. create_listing_draft / listing_missing / submit_listing for the wizard.
-- 6. business_commission_bps for the "You'll earn" preview.
-- 7. Group size changes resize future sessions.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
alter table public.listings
  add column min_age smallint check (min_age between 0 and 99),
  add column activity_level text check (activity_level in ('light', 'moderate', 'strenuous', 'extreme')),
  add column skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced', 'expert')),
  add column private_max_guests integer not null default 0 check (private_max_guests between 0 and 500),
  add column booking_cutoff_minutes integer not null default 0 check (booking_cutoff_minutes between 0 and 20160),
  add column group_discount_min_guests integer check (group_discount_min_guests between 2 and 500),
  add column group_discount_percent smallint check (group_discount_percent between 1 and 90),
  add column early_bird_days integer check (early_bird_days between 1 and 365),
  add column early_bird_percent smallint check (early_bird_percent between 1 and 90),
  add column address_line1 text check (char_length(address_line1) <= 200),
  add column province text check (char_length(province) <= 60),
  add column postal_code text check (postal_code ~ '^[0-9]{5}$'),
  add column wizard_step text check (char_length(wizard_step) <= 40),
  add column submitted_at timestamptz,
  add constraint listings_group_discount_pair check ((group_discount_min_guests is null) = (group_discount_percent is null)),
  add constraint listings_early_bird_pair check ((early_bird_days is null) = (early_bird_percent is null)),
  add constraint listings_includes_size check (cardinality(includes) <= 20);

comment on column public.listings.private_max_guests is 'Largest private group (whole session). 0 = no private bookings.';
comment on column public.listings.booking_cutoff_minutes is 'Guests can book until this many minutes before the start.';
comment on column public.listings.wizard_step is 'Last wizard step saved (portal resumes there).';

alter table public.bookings
  add column offer_discount_amount integer not null default 0 check (offer_discount_amount >= 0),
  add column offer_label text check (char_length(offer_label) <= 60),
  add constraint bookings_offer_within_discount check (offer_discount_amount <= discount_amount);

comment on column public.bookings.offer_discount_amount is
  'The listing''s own discount (large group or early bird), included in discount_amount.';

-- ---------------------------------------------------------------------------
-- 2. Offer discounts
-- ---------------------------------------------------------------------------
-- The better of the listing's large-group and early-bird discounts (they
-- don't stack). Large-group needs a public booking of N+ guests; early-bird
-- needs a start at least X days away.
create function private.listing_offer(
  p_listing public.listings,
  p_guest_count integer,
  p_starts_at timestamptz,
  p_subtotal integer,
  p_private boolean
)
returns table (amount integer, label text)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_group integer := 0;
  v_early integer := 0;
begin
  if not p_private and p_listing.group_discount_percent is not null
     and p_guest_count >= p_listing.group_discount_min_guests then
    v_group := p_listing.group_discount_percent;
  end if;
  if p_listing.early_bird_percent is not null and p_starts_at is not null
     and p_starts_at >= now() + make_interval(days => p_listing.early_bird_days) then
    v_early := p_listing.early_bird_percent;
  end if;
  if v_group = 0 and v_early = 0 then
    return query select 0, null::text;
  elsif v_group >= v_early then
    return query select round(p_subtotal * v_group / 100.0)::integer, format('Group discount (%s%%)', v_group);
  else
    return query select round(p_subtotal * v_early / 100.0)::integer, format('Early-bird discount (%s%%)', v_early);
  end if;
end;
$$;

drop function public.quote_booking(uuid, integer, jsonb, text, boolean);

create function public.quote_booking(
  p_listing_id uuid,
  p_guest_count integer default 1,
  p_items jsonb default null,
  p_coupon_code text default null,
  p_private boolean default false,
  p_starts_at timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_listing public.listings;
  v_subtotal integer;
  v_offer integer;
  v_offer_label text;
  v_coupon_id uuid;
  v_discount integer := 0;
  v_error text;
  v_title text;
begin
  select * into v_listing from public.listings where id = p_listing_id;
  if not found or not private.is_listing_public(p_listing_id) then
    raise exception 'Listing is not available' using errcode = 'P0002';
  end if;
  v_subtotal := private.booking_subtotal(v_listing, p_guest_count, p_items, p_private);
  select o.amount, o.label into v_offer, v_offer_label
  from private.listing_offer(v_listing, p_guest_count, p_starts_at, v_subtotal, p_private) o;

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    begin
      select c.coupon_id, c.discount into v_coupon_id, v_discount
      from private.apply_coupon(p_coupon_code, p_listing_id, v_subtotal - v_offer, (select auth.uid())) c;
      select title into v_title from public.coupons where id = v_coupon_id;
    exception when sqlstate '22023' then
      v_error := sqlerrm;
      v_discount := 0;
    end;
  end if;

  return jsonb_build_object(
    'subtotal', v_subtotal,
    'offer_discount', v_offer,
    'offer_label', v_offer_label,
    'discount', v_discount,
    'total', v_subtotal - v_offer - v_discount,
    'currency', v_listing.currency,
    'coupon_title', v_title,
    'coupon_error', v_error
  );
end;
$$;

revoke execute on function public.quote_booking(uuid, integer, jsonb, text, boolean, timestamptz) from public;
grant execute on function public.quote_booking(uuid, integer, jsonb, text, boolean, timestamptz) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Cut-off
-- ---------------------------------------------------------------------------
create function private.slot_bookable(p_listing_id uuid, p_starts_at timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_starts_at > now() + make_interval(mins => coalesce(
    (select l.booking_cutoff_minutes from public.listings l where l.id = p_listing_id), 0));
$$;

drop policy "slots: public read upcoming" on public.slots;
create policy "slots: public read upcoming" on public.slots
  for select to anon, authenticated
  using (
    status <> 'cancelled'
    and starts_at > now()
    and (select private.is_listing_public(listing_id))
    and private.slot_bookable(listing_id, starts_at)
  );

-- create_booking: as before, plus the offer discount and the cut-off.
create or replace function public.create_booking(
  p_listing_id uuid,
  p_slot_id uuid default null,
  p_starts_at timestamptz default null,
  p_staff_id uuid default null,
  p_guest_count integer default 1,
  p_items jsonb default null,
  p_coupon_code text default null,
  p_notes text default null,
  p_group_id uuid default null,
  p_source public.booking_source default 'app',
  p_idempotency_key text default null,
  p_contact_phone text default null,
  p_private boolean default false
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_listing public.listings;
  v_slot public.slots;
  v_booking public.bookings;
  v_coupon_id uuid;
  v_starts timestamptz;
  v_ends timestamptz;
  v_staff uuid;
  v_duration integer;
  v_subtotal integer;
  v_offer integer := 0;
  v_offer_label text;
  v_discount integer := 0;
  v_item jsonb;
  v_option public.listing_options;
  v_qty integer;
  v_items jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Sign in to book' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    select * into v_booking from public.bookings
    where consumer_id = v_uid and idempotency_key = p_idempotency_key;
    if found then
      return v_booking;
    end if;
  end if;

  select * into v_listing from public.listings where id = p_listing_id;
  if not found or not private.is_listing_public(p_listing_id) then
    raise exception 'Listing is not available' using errcode = 'P0002';
  end if;

  if p_private then
    if v_listing.booking_mode <> 'slot' then
      raise exception 'Only sessions can be booked privately' using errcode = '22023';
    end if;
    if v_listing.private_max_guests > 0 and p_guest_count > v_listing.private_max_guests then
      raise exception 'Private groups take up to % guests', v_listing.private_max_guests using errcode = '22023';
    end if;
  elsif p_guest_count < v_listing.min_guests or p_guest_count > v_listing.max_guests then
    raise exception 'Guest count must be between % and %', v_listing.min_guests, v_listing.max_guests
      using errcode = '22023';
  end if;

  if p_group_id is not null and not private.is_group_member(p_group_id) then
    raise exception 'You are not a member of this group' using errcode = '42501';
  end if;

  -- Price (validates options) and duration.
  v_subtotal := private.booking_subtotal(v_listing, p_guest_count, p_items, p_private);
  v_duration := v_listing.duration_minutes;
  if not p_private and p_items is not null and jsonb_array_length(p_items) > 0 then
    for v_item in select * from jsonb_array_elements(p_items) loop
      select * into v_option from public.listing_options
      where id = (v_item ->> 'option_id')::uuid and listing_id = p_listing_id and is_active;
      v_qty := coalesce((v_item ->> 'quantity')::int, 1);
      if v_qty < 1 or (v_option.max_quantity is not null and v_qty > v_option.max_quantity) then
        raise exception 'Invalid quantity for %', v_option.name using errcode = '22023';
      end if;
      v_duration := greatest(v_duration, coalesce(v_option.duration_minutes, 0));
      v_items := v_items || jsonb_build_object(
        'option_id', v_option.id, 'name', v_option.name, 'quantity', v_qty,
        'unit_amount', v_option.price_amount, 'total_amount', v_option.price_amount * v_qty
      );
    end loop;
  end if;

  -- Time and capacity.
  if v_listing.booking_mode = 'slot' then
    if p_slot_id is null then
      raise exception 'Choose a time slot' using errcode = '22023';
    end if;
    select * into v_slot from public.slots
    where id = p_slot_id and listing_id = p_listing_id
    for update;
    if not found or v_slot.status = 'cancelled' or v_slot.starts_at <= now() then
      raise exception 'This slot is no longer available' using errcode = 'P0002';
    end if;
    if not private.slot_bookable(p_listing_id, v_slot.starts_at) then
      raise exception 'Bookings for this session have closed' using errcode = '22023';
    end if;
    if p_private and v_slot.seats_booked > 0 then
      raise exception 'Someone already booked this session, so it can''t be booked privately' using errcode = '23P01';
    end if;
    if p_private and v_listing.private_max_guests = 0 and p_guest_count > v_slot.capacity then
      raise exception 'This session takes up to % guests', v_slot.capacity using errcode = '22023';
    end if;
    if not p_private and v_slot.capacity - v_slot.seats_booked < p_guest_count then
      raise exception 'Only % seats left in this slot', greatest(v_slot.capacity - v_slot.seats_booked, 0)
        using errcode = '23P01';
    end if;
    v_starts := v_slot.starts_at;
    v_ends := v_slot.ends_at;
    v_staff := v_slot.staff_id;
  else
    if p_starts_at is null then
      raise exception 'Choose a time' using errcode = '22023';
    end if;
    select t.staff_id into v_staff
    from public.get_available_times(
      p_listing_id,
      (p_starts_at at time zone (select timezone from public.businesses where id = v_listing.business_id))::date,
      p_staff_id,
      (p_items -> 0 ->> 'option_id')::uuid
    ) t
    where t.starts_at = p_starts_at
    limit 1;
    if v_staff is null then
      raise exception 'This time is no longer available' using errcode = '23P01';
    end if;
    v_starts := p_starts_at;
    v_ends := p_starts_at + make_interval(mins => v_duration);
  end if;

  -- The listing's own discount, then the coupon on what's left.
  select o.amount, o.label into v_offer, v_offer_label
  from private.listing_offer(v_listing, p_guest_count, v_starts, v_subtotal, p_private) o;

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select c.coupon_id, c.discount into v_coupon_id, v_discount
    from private.apply_coupon(p_coupon_code, p_listing_id, v_subtotal - v_offer, v_uid) c;
  end if;

  insert into public.bookings (
    business_id, consumer_id, listing_id, slot_id, staff_id, location_id,
    starts_at, ends_at, guest_count, status,
    contact_name, contact_phone, contact_email, notes,
    subtotal_amount, discount_amount, offer_discount_amount, offer_label, total_amount, currency,
    coupon_id, group_id, source, idempotency_key, is_private
  )
  select
    v_listing.business_id, v_uid, p_listing_id, v_slot.id, v_staff, v_listing.location_id,
    v_starts, v_ends, p_guest_count,
    case when v_listing.instant_book then 'confirmed'::public.booking_status else 'pending'::public.booking_status end,
    p.display_name, coalesce(p_contact_phone, pp.phone), pp.email::text, p_notes,
    v_subtotal, v_offer + v_discount, v_offer, v_offer_label, v_subtotal - v_offer - v_discount, v_listing.currency,
    v_coupon_id, p_group_id, p_source, p_idempotency_key, p_private
  from public.profiles p
  left join public.profile_private pp on pp.user_id = p.id
  where p.id = v_uid
  returning * into v_booking;

  insert into public.booking_items (business_id, booking_id, option_id, name, quantity, unit_amount, total_amount)
  select v_booking.business_id, v_booking.id, (i ->> 'option_id')::uuid, i ->> 'name',
         (i ->> 'quantity')::int, (i ->> 'unit_amount')::int, (i ->> 'total_amount')::int
  from jsonb_array_elements(v_items) i;

  if v_coupon_id is not null then
    insert into public.coupon_redemptions (coupon_id, business_id, user_id, booking_id, discount_amount)
    select v_coupon_id, c.business_id, v_uid, v_booking.id, v_discount from public.coupons c where c.id = v_coupon_id;
  end if;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Appointment times: staff shifts inside the business's opening hours (when
--    it has any), the buffer between appointments and the cut-off.
-- ---------------------------------------------------------------------------
create or replace function public.get_available_times(
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
    select l.id, l.business_id, b.timezone, l.slot_interval_minutes, l.buffer_minutes, l.booking_cutoff_minutes,
           coalesce(o.duration_minutes, l.duration_minutes) as duration,
           exists (select 1 from public.business_hours h where h.business_id = l.business_id) as has_hours
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
           l.buffer_minutes, l.business_id, l.id as listing_id, l.booking_cutoff_minutes, l.has_hours, l.timezone
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
  where c.starts_at > now() + make_interval(mins => c.booking_cutoff_minutes)
    and (
      not c.has_hours
      or exists (
        select 1 from public.business_hours h
        where h.business_id = c.business_id
          and h.weekday = extract(dow from p_date)::smallint -- business_hours: 0 = Sunday
          and (c.starts_at at time zone c.timezone)::time >= h.opens_at
          and (case when h.closes_at <= h.opens_at then true
                    else (c.ends_at at time zone c.timezone)::time <= h.closes_at
                         and (c.ends_at at time zone c.timezone)::date = p_date end)
      )
    )
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
-- 5. Wizard
-- ---------------------------------------------------------------------------
-- Step 1 creates the draft so every later step autosaves to it.
create function public.create_listing_draft(p_business_id uuid, p_type public.listing_type)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
  v_city text;
begin
  if not (private.is_business_manager(p_business_id) or private.is_super_admin()) then
    raise exception 'Only owners and managers can create listings' using errcode = '42501';
  end if;
  select coalesce(
    (select bl.city from public.business_locations bl where bl.business_id = p_business_id order by bl.is_primary desc, bl.created_at limit 1),
    'Lahore'
  ) into v_city;

  insert into public.listings (
    id, business_id, type, booking_mode, slug, title, city, duration_minutes, price_amount,
    min_guests, max_guests, instant_book, cancellation_policy, languages, status, wizard_step
  ) values (
    v_id, p_business_id, p_type,
    case when p_type = 'service' then 'appointment'::public.booking_mode else 'slot'::public.booking_mode end,
    'draft-' || substr(replace(v_id::text, '-', ''), 1, 12),
    case when p_type = 'service' then 'Untitled service' else 'Untitled experience' end,
    v_city,
    case when p_type = 'service' then 60 else 120 end,
    0, 1, case when p_type = 'service' then 1 else 10 end,
    true, 'flexible', '{en}', 'draft', 'type'
  );
  return v_id;
end;
$$;

revoke execute on function public.create_listing_draft(uuid, public.listing_type) from public, anon;
grant execute on function public.create_listing_draft(uuid, public.listing_type) to authenticated;

-- What a listing still needs before it can be submitted. Keys match
-- `listingChecklist` in @moment/shared (PUBLISH_MIN_* there).
create function public.listing_missing(p_listing_id uuid)
returns text[]
language sql
stable
security invoker
set search_path = ''
as $$
  select array_remove(array[
    case when l.title ~* '^untitled ' or char_length(l.title) < 10 then 'title' end,
    case when char_length(coalesce(l.description, '')) < 100 then 'description' end,
    case when l.category_id is null then 'category' end,
    case when (select count(*) from public.listing_media m where m.listing_id = l.id) < 5 then 'photos' end,
    case when l.price_amount <= 0 then 'price' end,
    case when l.meeting_point is null and l.location_id is null then 'location' end,
    case when l.booking_mode = 'slot' and not exists (
           select 1 from public.availability_rules r where r.listing_id = l.id and r.is_active)
         and not exists (
           select 1 from public.slots s where s.listing_id = l.id and s.starts_at > now() and s.status <> 'cancelled')
         then 'availability' end,
    case when l.booking_mode = 'appointment' and not exists (
           select 1 from public.listing_staff ls
           join public.staff_schedules sch on sch.staff_id = ls.staff_id
           where ls.listing_id = l.id)
         then 'availability' end,
    case when l.type = 'service' and not exists (select 1 from public.listing_staff ls where ls.listing_id = l.id)
         then 'staff' end
  ], null)
  from public.listings l
  where l.id = p_listing_id;
$$;

grant execute on function public.listing_missing(uuid) to authenticated;

-- "Submit for review": checks the listing is complete, gives it a slug from
-- its title and waits for Moment's review. Super admins (or AUTO_APPROVE on
-- development / staging, via the portal) publish it.
create function public.submit_listing(p_listing_id uuid)
returns public.listings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_listing public.listings;
  v_missing text[];
  v_base text;
  v_slug text;
  v_attempt integer := 0;
begin
  select * into v_listing from public.listings where id = p_listing_id;
  if not found then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;
  if not (private.is_business_manager(v_listing.business_id) or private.is_super_admin()) then
    raise exception 'Only owners and managers can submit listings' using errcode = '42501';
  end if;
  if v_listing.status not in ('draft', 'pending_review') then
    raise exception 'This listing is already %', v_listing.status using errcode = '22023';
  end if;
  v_missing := public.listing_missing(p_listing_id);
  if cardinality(v_missing) > 0 then
    raise exception 'Finish these steps first: %', array_to_string(v_missing, ', ') using errcode = '22023';
  end if;

  v_base := left(btrim(regexp_replace(lower(v_listing.title), '[^a-z0-9]+', '-', 'g'), '-'), 70);
  if v_base = '' then
    v_base := 'listing';
  end if;
  v_slug := case when v_listing.slug::text like 'draft-%' then v_base else v_listing.slug::text end;
  loop
    begin
      update public.listings
      set status = 'pending_review', submitted_at = now(), slug = v_slug, wizard_step = 'review'
      where id = p_listing_id
      returning * into v_listing;
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt > 5 then
        raise;
      end if;
      v_slug := v_base || '-' || substr(md5(random()::text), 1, 4);
    end;
  end loop;
  return v_listing;
end;
$$;

revoke execute on function public.submit_listing(uuid) from public, anon;
grant execute on function public.submit_listing(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Moment's commission, for "You'll earn" (team members only).
-- ---------------------------------------------------------------------------
create function public.business_commission_bps()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (s.value #>> '{}')::integer from public.platform_settings s where s.key = 'payments.commission_bps'), 1000)
  where exists (select 1 from public.business_members m where m.user_id = (select auth.uid()) and m.status = 'active')
     or private.is_super_admin();
$$;

revoke execute on function public.business_commission_bps() from public, anon;
grant execute on function public.business_commission_bps() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Group size: future sessions follow the listing's maximum.
-- ---------------------------------------------------------------------------
create function private.listings_resize_sessions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.availability_rules set capacity = new.max_guests, updated_at = now()
  where listing_id = new.id and capacity <> new.max_guests;
  update public.slots
  set capacity = greatest(new.max_guests, seats_booked),
      status = case when status = 'cancelled' then status
                    when seats_booked >= greatest(new.max_guests, seats_booked) then 'full'::public.slot_status
                    else 'open'::public.slot_status end
  where listing_id = new.id and starts_at > now() and capacity <> greatest(new.max_guests, seats_booked);
  return null;
end;
$$;

create trigger listings_resize_sessions
  after update of max_guests on public.listings
  for each row when (old.max_guests is distinct from new.max_guests and new.booking_mode = 'slot')
  execute function private.listings_resize_sessions();

-- ---------------------------------------------------------------------------
-- 8. New listings go live through review: a client (owner, manager) can't
--    publish a listing that was never approved. Re-publishing one that was
--    live before (after Unpublish) stays allowed. Super admins and the
--    service role (auto-approve on development / staging) can publish.
-- ---------------------------------------------------------------------------
create function private.listings_publish_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and old.status <> 'published' and old.published_at is null
     and private.is_client_request() and not private.is_super_admin() then
    raise exception 'New listings go live after Moment reviews them. Submit it for review.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger listings_publish_guard before update of status on public.listings
  for each row execute function private.listings_publish_guard();
