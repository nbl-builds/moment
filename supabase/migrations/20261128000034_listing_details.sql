-- Listing Details page in the business portal.
--
-- 1. listings.accepting_bookings: "Accepting bookings" toggle. Off pauses new
--    bookings from guests (app and web) without unpublishing; the business can
--    still add bookings itself (portal, POS).
-- 2. listing_stats(): last 30 days for one listing (views, bookings,
--    conversion, revenue for owners and managers) with a daily views series.
-- 3. duplicate_listing(): copies a listing as a new draft.
-- 4. listing_point(): latitude / longitude of the meeting point (or the
--    listing's location) for the map preview.

alter table public.listings add column accepting_bookings boolean not null default true;

comment on column public.listings.accepting_bookings is
  'Off: guests cannot book (create_booking refuses) while the listing stays published.';

create function private.bookings_check_accepting()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.source in ('app', 'web') and exists (
    select 1 from public.listings l where l.id = new.listing_id and not l.accepting_bookings
  ) then
    raise exception 'This experience isn''t taking new bookings right now' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger bookings_check_accepting before insert on public.bookings
  for each row execute function private.bookings_check_accepting();

-- ---------------------------------------------------------------------------
-- listing_stats
-- ---------------------------------------------------------------------------
create function public.listing_stats(p_listing_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_business uuid;
  v_tz text;
  v_today date;
  v_from timestamptz;
  v_prev timestamptz;
  v_can_money boolean;
begin
  select l.business_id, b.timezone into v_business, v_tz
  from public.listings l join public.businesses b on b.id = l.business_id
  where l.id = p_listing_id;
  if v_business is null or not (private.is_business_member(v_business) or private.is_super_admin()) then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;
  v_can_money := private.is_business_manager(v_business) or private.is_super_admin();
  v_today := (now() at time zone v_tz)::date;
  v_from := ((v_today - 29)::timestamp) at time zone v_tz;
  v_prev := ((v_today - 59)::timestamp) at time zone v_tz;

  return jsonb_build_object(
    'views', (select count(*) from public.listing_views v where v.listing_id = p_listing_id and v.viewed_at >= v_from),
    'views_previous', (select count(*) from public.listing_views v where v.listing_id = p_listing_id
      and v.viewed_at >= v_prev and v.viewed_at < v_from),
    'bookings', (select count(*) from public.bookings b where b.listing_id = p_listing_id and b.created_at >= v_from),
    'bookings_previous', (select count(*) from public.bookings b where b.listing_id = p_listing_id
      and b.created_at >= v_prev and b.created_at < v_from),
    'revenue', case when v_can_money then (
      select coalesce(sum(p.amount - p.platform_fee_amount), 0)
      from public.payments p join public.bookings b on b.id = p.booking_id
      where b.listing_id = p_listing_id and p.status = 'succeeded' and p.created_at >= v_from
    ) end,
    'currency', (select b.currency from public.businesses b where b.id = v_business),
    'series', (
      select jsonb_agg(jsonb_build_object('day', d.day, 'views', (
        select count(*) from public.listing_views v
        where v.listing_id = p_listing_id
          and v.viewed_at >= (d.day::timestamp at time zone v_tz)
          and v.viewed_at < ((d.day + 1)::timestamp at time zone v_tz)
      )) order by d.day)
      from (select (v_today - g)::date as day from generate_series(0, 29) g) d
    )
  );
end;
$$;

revoke execute on function public.listing_stats(uuid) from public, anon;
grant execute on function public.listing_stats(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- duplicate_listing
-- ---------------------------------------------------------------------------
-- Runs as the caller: listing write policies (owners and managers) apply.
create function public.duplicate_listing(p_listing_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_src public.listings;
  v_id uuid := gen_random_uuid();
  v_slug text;
  v_attempt integer := 0;
begin
  select * into v_src from public.listings where id = p_listing_id;
  if not found then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;
  if not (private.is_business_manager(v_src.business_id) or private.is_super_admin()) then
    raise exception 'Only owners and managers can duplicate listings' using errcode = '42501';
  end if;

  v_slug := left(v_src.slug::text, 70) || '-copy';
  loop
    begin
      insert into public.listings (
        id, business_id, type, booking_mode, slug, title, summary, description, category_id, location_id,
        meeting_point, meeting_point_notes, city, duration_minutes, slot_interval_minutes, buffer_minutes,
        min_guests, max_guests, price_amount, currency, price_unit, instant_book, cancellation_policy,
        languages, includes, excludes, highlights, what_to_bring, status, accepting_bookings
      ) values (
        v_id, v_src.business_id, v_src.type, v_src.booking_mode, v_slug, left(v_src.title || ' (copy)', 140), v_src.summary,
        v_src.description, v_src.category_id, v_src.location_id, v_src.meeting_point, v_src.meeting_point_notes, v_src.city,
        v_src.duration_minutes, v_src.slot_interval_minutes, v_src.buffer_minutes, v_src.min_guests, v_src.max_guests,
        v_src.price_amount, v_src.currency, v_src.price_unit, v_src.instant_book, v_src.cancellation_policy,
        v_src.languages, v_src.includes, v_src.excludes, v_src.highlights, v_src.what_to_bring, 'draft', true
      );
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt > 5 then
        raise;
      end if;
      v_slug := left(v_src.slug::text, 70) || '-copy-' || substr(md5(random()::text), 1, 4);
    end;
  end loop;

  insert into public.listing_options (business_id, listing_id, name, description, price_amount, duration_minutes, max_quantity, is_active, sort_order)
  select o.business_id, v_id, o.name, o.description, o.price_amount, o.duration_minutes, o.max_quantity, o.is_active, o.sort_order
  from public.listing_options o where o.listing_id = p_listing_id;

  insert into public.listing_media (business_id, listing_id, url, alt, sort_order)
  select m.business_id, v_id, m.url, m.alt, m.sort_order from public.listing_media m where m.listing_id = p_listing_id;

  insert into public.listing_tags (business_id, listing_id, tag_id)
  select t.business_id, v_id, t.tag_id from public.listing_tags t where t.listing_id = p_listing_id;

  insert into public.listing_staff (business_id, listing_id, staff_id)
  select s.business_id, v_id, s.staff_id from public.listing_staff s where s.listing_id = p_listing_id;

  insert into public.listing_itinerary_steps (business_id, listing_id, position, title, description, duration_minutes)
  select i.business_id, v_id, i.position, i.title, i.description, i.duration_minutes
  from public.listing_itinerary_steps i where i.listing_id = p_listing_id;

  return v_id;
end;
$$;

revoke execute on function public.duplicate_listing(uuid) from public, anon;
grant execute on function public.duplicate_listing(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- listing_point
-- ---------------------------------------------------------------------------
create function public.listing_point(p_listing_id uuid)
returns table (lat double precision, lng double precision, from_meeting_point boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select extensions.st_y(coalesce(l.meeting_point, bl.geo)::extensions.geometry),
         extensions.st_x(coalesce(l.meeting_point, bl.geo)::extensions.geometry),
         l.meeting_point is not null
  from public.listings l
  left join public.business_locations bl on bl.id = l.location_id
  where l.id = p_listing_id and coalesce(l.meeting_point, bl.geo) is not null;
$$;

grant execute on function public.listing_point(uuid) to anon, authenticated;
