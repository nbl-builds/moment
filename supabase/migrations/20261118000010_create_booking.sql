-- create_booking: runs after coupons and memberships exist, since it uses their row types.

-- ---------------------------------------------------------------------------
-- create_booking
-- ---------------------------------------------------------------------------
-- p_items: [{"option_id": "...", "quantity": 2}]. When omitted, the listing's
-- base price is used (per person or per booking).
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
  p_contact_phone text default null
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
  v_coupon public.coupons;
  v_starts timestamptz;
  v_ends timestamptz;
  v_staff uuid;
  v_duration integer;
  v_subtotal integer := 0;
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

  -- Price lines. Options may change the duration (e.g. 90-minute massage).
  v_duration := v_listing.duration_minutes;
  if p_items is not null and jsonb_array_length(p_items) > 0 then
    for v_item in select * from jsonb_array_elements(p_items) loop
      select * into v_option from public.listing_options
      where id = (v_item ->> 'option_id')::uuid and listing_id = p_listing_id and is_active;
      if not found then
        raise exception 'Unknown option %', v_item ->> 'option_id' using errcode = '22023';
      end if;
      v_qty := coalesce((v_item ->> 'quantity')::int, 1);
      if v_qty < 1 or (v_option.max_quantity is not null and v_qty > v_option.max_quantity) then
        raise exception 'Invalid quantity for %', v_option.name using errcode = '22023';
      end if;
      v_subtotal := v_subtotal + v_option.price_amount * v_qty;
      v_duration := greatest(v_duration, coalesce(v_option.duration_minutes, 0));
      v_items := v_items || jsonb_build_object(
        'option_id', v_option.id, 'name', v_option.name, 'quantity', v_qty,
        'unit_amount', v_option.price_amount, 'total_amount', v_option.price_amount * v_qty
      );
    end loop;
  else
    v_subtotal := v_listing.price_amount
      * case when v_listing.price_unit = 'per_person' then p_guest_count else 1 end;
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
    if v_slot.capacity - v_slot.seats_booked < p_guest_count then
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

  -- Coupon.
  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select c.* into v_coupon from public.coupons c
    where lower(c.code) = lower(trim(p_coupon_code))
      and c.is_active
      and (c.business_id is null or c.business_id = v_listing.business_id)
      and (c.listing_ids is null or p_listing_id = any (c.listing_ids))
      and (c.starts_at is null or c.starts_at <= now())
      and (c.ends_at is null or c.ends_at > now())
    order by c.business_id nulls last
    limit 1;
    if not found then
      raise exception 'This coupon is not valid' using errcode = '22023';
    end if;
    if v_subtotal < v_coupon.min_subtotal_amount then
      raise exception 'This coupon needs a minimum spend' using errcode = '22023';
    end if;
    if v_coupon.max_redemptions is not null and (
      select count(*) from public.coupon_redemptions r
      join public.bookings b on b.id = r.booking_id
      where r.coupon_id = v_coupon.id
        and b.status not in ('cancelled_by_consumer', 'cancelled_by_business')
    ) >= v_coupon.max_redemptions then
      raise exception 'This coupon has been fully redeemed' using errcode = '22023';
    end if;
    if v_coupon.per_user_limit is not null and (
      select count(*) from public.coupon_redemptions r
      join public.bookings b on b.id = r.booking_id
      where r.coupon_id = v_coupon.id and r.user_id = v_uid
        and b.status not in ('cancelled_by_consumer', 'cancelled_by_business')
    ) >= v_coupon.per_user_limit then
      raise exception 'You have already used this coupon' using errcode = '22023';
    end if;

    if v_coupon.discount_type = 'percent' then
      v_discount := floor(v_subtotal * v_coupon.discount_value / 100.0);
    else
      v_discount := v_coupon.discount_value;
    end if;
    if v_coupon.max_discount_amount is not null then
      v_discount := least(v_discount, v_coupon.max_discount_amount);
    end if;
    v_discount := least(v_discount, v_subtotal);
  end if;

  insert into public.bookings (
    business_id, consumer_id, listing_id, slot_id, staff_id, location_id,
    starts_at, ends_at, guest_count, status,
    contact_name, contact_phone, contact_email, notes,
    subtotal_amount, discount_amount, total_amount, currency,
    coupon_id, group_id, source, idempotency_key
  )
  select
    v_listing.business_id, v_uid, p_listing_id, v_slot.id, v_staff, v_listing.location_id,
    v_starts, v_ends, p_guest_count,
    case when v_listing.instant_book then 'confirmed'::public.booking_status else 'pending'::public.booking_status end,
    p.display_name, coalesce(p_contact_phone, pp.phone), pp.email::text, p_notes,
    v_subtotal, v_discount, v_subtotal - v_discount, v_listing.currency,
    v_coupon.id, p_group_id, p_source, p_idempotency_key
  from public.profiles p
  left join public.profile_private pp on pp.user_id = p.id
  where p.id = v_uid
  returning * into v_booking;

  insert into public.booking_items (business_id, booking_id, option_id, name, quantity, unit_amount, total_amount)
  select v_booking.business_id, v_booking.id, (i ->> 'option_id')::uuid, i ->> 'name',
         (i ->> 'quantity')::int, (i ->> 'unit_amount')::int, (i ->> 'total_amount')::int
  from jsonb_array_elements(v_items) i;

  if v_coupon.id is not null then
    insert into public.coupon_redemptions (coupon_id, business_id, user_id, booking_id, discount_amount)
    values (v_coupon.id, v_coupon.business_id, v_uid, v_booking.id, v_discount);
  end if;

  return v_booking;
end;
$$;

revoke execute on function public.create_booking from anon;
