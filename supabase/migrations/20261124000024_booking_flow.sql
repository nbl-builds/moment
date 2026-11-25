-- Booking Flow (Figma "Booking Flow" 47:3637 ... 48:7876).
-- * Listings say whether pets come along and whether a slot can be booked
--   privately (whole session, one price per booking).
-- * A private booking takes the whole slot.
-- * Coupon checks are shared by create_booking and quote_booking, so the
--   Confirm screen shows exactly what the booking will charge.
-- * create_bookings books a services cart in one transaction.
-- * available_dates greys out days without free times in "Select Date".

alter table public.listings
  add column pets_allowed boolean not null default false,
  -- Private group: book the whole slot for this price; null = not offered.
  add column private_price_amount integer check (private_price_amount >= 0);

alter table public.bookings add column is_private boolean not null default false;

-- Private bookings fill the slot.
create or replace function private.recount_slot(p_slot_id uuid)
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
    select coalesce(sum(case when b.is_private then sl.capacity else b.guest_count end), 0)::int as seats
    from public.bookings b
    join public.slots sl on sl.id = b.slot_id
    where b.slot_id = p_slot_id and b.status in ('pending', 'confirmed', 'completed', 'no_show')
  ) c
  where s.id = p_slot_id;
$$;

-- ---------------------------------------------------------------------------
-- Coupons: one check for quotes and bookings. Raises with a reason the app shows.
-- ---------------------------------------------------------------------------
create function private.apply_coupon(
  p_code text,
  p_listing_id uuid,
  p_subtotal integer,
  p_user_id uuid
)
returns table (coupon_id uuid, discount integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_listing public.listings;
  v_coupon public.coupons;
  v_discount integer;
begin
  select * into v_listing from public.listings where id = p_listing_id;

  select c.* into v_coupon from public.coupons c
  where lower(c.code) = lower(trim(p_code))
    and c.is_active
    and (c.business_id is null or c.business_id = v_listing.business_id)
  order by c.business_id nulls last
  limit 1;
  if not found then
    raise exception 'This code doesn''t exist' using errcode = '22023';
  end if;
  if v_coupon.listing_ids is not null and not (p_listing_id = any (v_coupon.listing_ids)) then
    raise exception 'This code isn''t valid for this booking' using errcode = '22023';
  end if;
  if v_coupon.starts_at is not null and v_coupon.starts_at > now() then
    raise exception 'This code isn''t active yet' using errcode = '22023';
  end if;
  if v_coupon.ends_at is not null and v_coupon.ends_at <= now() then
    raise exception 'This code has expired' using errcode = '22023';
  end if;
  if p_subtotal < v_coupon.min_subtotal_amount then
    raise exception 'Spend at least % to use this code', v_coupon.min_subtotal_amount using errcode = '22023';
  end if;
  if v_coupon.max_redemptions is not null and (
    select count(*) from public.coupon_redemptions r
    join public.bookings b on b.id = r.booking_id
    where r.coupon_id = v_coupon.id and b.status not in ('cancelled_by_consumer', 'cancelled_by_business')
  ) >= v_coupon.max_redemptions then
    raise exception 'This code has been fully redeemed' using errcode = '22023';
  end if;
  if p_user_id is not null and v_coupon.per_user_limit is not null and (
    select count(*) from public.coupon_redemptions r
    join public.bookings b on b.id = r.booking_id
    where r.coupon_id = v_coupon.id and r.user_id = p_user_id
      and b.status not in ('cancelled_by_consumer', 'cancelled_by_business')
  ) >= v_coupon.per_user_limit then
    raise exception 'You have already used this code' using errcode = '22023';
  end if;

  v_discount := case when v_coupon.discount_type = 'percent'
                     then floor(p_subtotal * v_coupon.discount_value / 100.0)::int
                     else v_coupon.discount_value end;
  if v_coupon.max_discount_amount is not null then
    v_discount := least(v_discount, v_coupon.max_discount_amount);
  end if;
  return query select v_coupon.id, least(v_discount, p_subtotal);
end;
$$;

-- Subtotal for a listing: chosen options, or the base price (per person or per
-- booking), or the private-group price.
create function private.booking_subtotal(
  p_listing public.listings,
  p_guest_count integer,
  p_items jsonb,
  p_private boolean
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total integer := 0;
  v_item jsonb;
  v_option public.listing_options;
  v_qty integer;
begin
  if p_private then
    if p_listing.private_price_amount is null then
      raise exception 'Private bookings aren''t offered for this experience' using errcode = '22023';
    end if;
    return p_listing.private_price_amount;
  end if;
  if p_items is not null and jsonb_array_length(p_items) > 0 then
    for v_item in select * from jsonb_array_elements(p_items) loop
      select * into v_option from public.listing_options
      where id = (v_item ->> 'option_id')::uuid and listing_id = p_listing.id and is_active;
      if not found then
        raise exception 'Unknown option %', v_item ->> 'option_id' using errcode = '22023';
      end if;
      v_qty := coalesce((v_item ->> 'quantity')::int, 1);
      v_total := v_total + v_option.price_amount * v_qty;
    end loop;
    return v_total;
  end if;
  return p_listing.price_amount * case when p_listing.price_unit = 'per_person' then p_guest_count else 1 end;
end;
$$;

-- ---------------------------------------------------------------------------
-- quote_booking: the Confirm screen's price lines and coupon check. Never
-- raises for a bad coupon; returns the reason instead.
-- ---------------------------------------------------------------------------
create function public.quote_booking(
  p_listing_id uuid,
  p_guest_count integer default 1,
  p_items jsonb default null,
  p_coupon_code text default null,
  p_private boolean default false
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

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    begin
      select c.coupon_id, c.discount into v_coupon_id, v_discount
      from private.apply_coupon(p_coupon_code, p_listing_id, v_subtotal, (select auth.uid())) c;
      select title into v_title from public.coupons where id = v_coupon_id;
    exception when sqlstate '22023' then
      v_error := sqlerrm;
      v_discount := 0;
    end;
  end if;

  return jsonb_build_object(
    'subtotal', v_subtotal,
    'discount', v_discount,
    'total', v_subtotal - v_discount,
    'currency', v_listing.currency,
    'coupon_title', v_title,
    'coupon_error', v_error
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- create_booking: as before, plus private slot bookings, and coupon/price
-- through the shared helpers above.
-- ---------------------------------------------------------------------------
drop function public.create_booking(uuid, uuid, timestamptz, uuid, integer, jsonb, text, text, uuid, public.booking_source, text, text);

create function public.create_booking(
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

  if p_guest_count < v_listing.min_guests or p_guest_count > v_listing.max_guests then
    raise exception 'Guest count must be between % and %', v_listing.min_guests, v_listing.max_guests
      using errcode = '22023';
  end if;

  if p_group_id is not null and not private.is_group_member(p_group_id) then
    raise exception 'You are not a member of this group' using errcode = '42501';
  end if;

  if p_private and v_listing.booking_mode <> 'slot' then
    raise exception 'Only sessions can be booked privately' using errcode = '22023';
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
    if p_private and v_slot.seats_booked > 0 then
      raise exception 'Someone already booked this session, so it can''t be booked privately' using errcode = '23P01';
    end if;
    if p_private and p_guest_count > v_slot.capacity then
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

  -- Coupon (same check as quote_booking).
  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select c.coupon_id, c.discount into v_coupon_id, v_discount
    from private.apply_coupon(p_coupon_code, p_listing_id, v_subtotal, v_uid) c;
  end if;

  insert into public.bookings (
    business_id, consumer_id, listing_id, slot_id, staff_id, location_id,
    starts_at, ends_at, guest_count, status,
    contact_name, contact_phone, contact_email, notes,
    subtotal_amount, discount_amount, total_amount, currency,
    coupon_id, group_id, source, idempotency_key, is_private
  )
  select
    v_listing.business_id, v_uid, p_listing_id, v_slot.id, v_staff, v_listing.location_id,
    v_starts, v_ends, p_guest_count,
    case when v_listing.instant_book then 'confirmed'::public.booking_status else 'pending'::public.booking_status end,
    p.display_name, coalesce(p_contact_phone, pp.phone), pp.email::text, p_notes,
    v_subtotal, v_discount, v_subtotal - v_discount, v_listing.currency,
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

revoke execute on function public.create_booking from anon;

-- ---------------------------------------------------------------------------
-- create_bookings: a services cart ("Your Reservation" with several services)
-- in one transaction: all booked, or none. Each element:
--   {"listing_id": "...", "starts_at": "...", "staff_id": null, "items": [...]}
-- The coupon applies to the most expensive service. Retrying with the same
-- idempotency key returns the same bookings.
-- ---------------------------------------------------------------------------
create function public.create_bookings(
  p_bookings jsonb,
  p_coupon_code text default null,
  p_notes text default null,
  p_idempotency_key text default null,
  p_contact_phone text default null,
  p_source public.booking_source default 'app'
)
returns setof public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := jsonb_array_length(coalesce(p_bookings, '[]'::jsonb));
  v_coupon_index integer := -1;
  v_best integer := -1;
  v_subtotal integer;
  v_listing public.listings;
  v_el jsonb;
  i integer;
begin
  if v_count = 0 then
    raise exception 'Add a service to book' using errcode = '22023';
  end if;
  if v_count > 10 then
    raise exception 'Book up to 10 services at a time' using errcode = '22023';
  end if;

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    for i in 0 .. v_count - 1 loop
      v_el := p_bookings -> i;
      select * into v_listing from public.listings where id = (v_el ->> 'listing_id')::uuid;
      v_subtotal := private.booking_subtotal(v_listing, 1, v_el -> 'items', false);
      if v_subtotal > v_best then
        v_best := v_subtotal;
        v_coupon_index := i;
      end if;
    end loop;
  end if;

  for i in 0 .. v_count - 1 loop
    v_el := p_bookings -> i;
    return query select * from public.create_booking(
      p_listing_id => (v_el ->> 'listing_id')::uuid,
      p_starts_at => (v_el ->> 'starts_at')::timestamptz,
      p_staff_id => (v_el ->> 'staff_id')::uuid,
      p_guest_count => 1,
      p_items => case when jsonb_typeof(v_el -> 'items') = 'array' then v_el -> 'items' end,
      p_coupon_code => case when i = v_coupon_index then p_coupon_code end,
      p_notes => p_notes,
      p_source => p_source,
      p_idempotency_key => case when p_idempotency_key is not null then p_idempotency_key || ':' || i end,
      p_contact_phone => p_contact_phone
    );
  end loop;
end;
$$;

revoke execute on function public.create_bookings from anon;

-- ---------------------------------------------------------------------------
-- available_dates: days in a range that have at least one free time, for the
-- "Select Date" calendar (appointment listings).
-- ---------------------------------------------------------------------------
create function public.available_dates(p_listing_id uuid, p_from date, p_to date)
returns setof date
language sql
stable
security definer
set search_path = ''
as $$
  select d::date
  from generate_series(p_from, least(p_to, p_from + 62), interval '1 day') d
  where exists (select 1 from public.get_available_times(p_listing_id, d::date) t);
$$;

-- ---------------------------------------------------------------------------
-- "Required for your booking": a phone confirmed later (Add -> code) lands on
-- auth.users; keep the profile's copy in sync, as on sign up.
-- ---------------------------------------------------------------------------
create function private.sync_auth_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profile_private
  set phone = case when new.phone is null or new.phone = '' then null
                   when left(new.phone, 1) = '+' then new.phone
                   else '+' || new.phone end
  where user_id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_phone_changed
  after update of phone on auth.users
  for each row when (old.phone is distinct from new.phone)
  execute function private.sync_auth_phone();
