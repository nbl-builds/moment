-- Business portal main area (Figma "Moment Business App": Dashboard, Calendar,
-- Inbox, Listings, Insights, Reviews).
--
-- 1. listing_views: views of experience / business pages, recorded by the apps
--    through record_listing_view() (one per viewer per page per 30 minutes;
--    the business's own team doesn't count). Nobody reads rows directly:
--    businesses get aggregates from business_insights().
-- 2. business_inbox(): the shared business inbox with unread counts for the
--    signed-in team member, search and a time filter.
-- 3. business_insights(): counts and series for the Insights page. Revenue and
--    wallet are only returned to owners.

-- ---------------------------------------------------------------------------
-- Listing views
-- ---------------------------------------------------------------------------
create table public.listing_views (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete cascade, -- null = business page
  viewer_id uuid references auth.users (id) on delete set null,
  session_key text check (session_key is null or char_length(session_key) between 8 and 64),
  source text not null default 'app' check (source in ('app', 'web')),
  viewed_at timestamptz not null default now()
);
create index listing_views_business_time_idx on public.listing_views (business_id, viewed_at);
create index listing_views_listing_time_idx on public.listing_views (listing_id, viewed_at);
create index listing_views_viewer_idx on public.listing_views (viewer_id, viewed_at desc);

alter table public.listing_views enable row level security;

create policy "listing_views: admins read" on public.listing_views
  for select to authenticated
  using ((select private.is_super_admin()));

revoke insert, update, delete on public.listing_views from anon, authenticated;
revoke select on public.listing_views from anon;

-- Records a view of a published listing (p_listing_id) or an active business's
-- page (p_business_id). Guests pass a random per-install session key so they
-- can be de-duplicated too. Returns true when a new view was stored.
create function public.record_listing_view(
  p_listing_id uuid default null,
  p_business_id uuid default null,
  p_session_key text default null,
  p_source text default 'app'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_business uuid;
begin
  if p_listing_id is not null then
    select l.business_id into v_business
    from public.listings l
    where l.id = p_listing_id and l.status = 'published' and private.is_business_active(l.business_id);
  elsif p_business_id is not null and private.is_business_active(p_business_id) then
    v_business := p_business_id;
  end if;
  if v_business is null then
    return false;
  end if;

  -- The business's own team browsing their pages isn't a view.
  if v_uid is not null and private.is_business_member(v_business) then
    return false;
  end if;

  if (v_uid is not null or p_session_key is not null) and exists (
    select 1 from public.listing_views v
    where v.business_id = v_business
      and v.listing_id is not distinct from p_listing_id
      and (v.viewer_id = v_uid or (v_uid is null and v.session_key = p_session_key))
      and v.viewed_at > now() - interval '30 minutes'
  ) then
    return false;
  end if;

  insert into public.listing_views (business_id, listing_id, viewer_id, session_key, source)
  values (
    v_business, p_listing_id, v_uid,
    case when v_uid is null then left(p_session_key, 64) end,
    case when p_source = 'web' then 'web' else 'app' end
  );
  return true;
end;
$$;

grant execute on function public.record_listing_view(uuid, uuid, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Business inbox
-- ---------------------------------------------------------------------------
-- One row per business conversation: the guest, the reservation (if the chat
-- is about one) or else the guest's latest listing booked here, the last
-- message, and how many guest messages the signed-in team member hasn't read.
create function public.business_inbox(
  p_business_id uuid,
  p_search text default null,
  p_unread_only boolean default false,
  p_since timestamptz default null,
  p_limit integer default 50
)
returns table (
  conversation_id uuid,
  booking_id uuid,
  listing_id uuid,
  listing_title text,
  listing_cover text,
  guest_id uuid,
  guest_name text,
  guest_avatar_url text,
  guest_city text,
  last_message_at timestamptz,
  last_message_body text,
  last_message_has_attachment boolean,
  unread integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not (private.is_business_member(p_business_id) or private.is_super_admin()) then
    raise exception 'Business not found' using errcode = 'P0002';
  end if;

  return query
  with convs as (
    select c.id, c.booking_id, c.created_by, c.last_message_at, c.created_at
    from public.conversations c
    where c.business_id = p_business_id and c.type = 'business'
      and (p_since is null or coalesce(c.last_message_at, c.created_at) >= p_since)
  ),
  enriched as (
    select
      c.id as conversation_id,
      c.booking_id,
      coalesce(b.listing_id, (
        select b2.listing_id from public.bookings b2
        where b2.business_id = p_business_id and b2.consumer_id = c.created_by
        order by b2.starts_at desc limit 1
      )) as listing_id,
      c.created_by as guest_id,
      pr.display_name as guest_name,
      pr.avatar_url as guest_avatar_url,
      pr.home_city as guest_city,
      coalesce(c.last_message_at, c.created_at) as last_message_at,
      lm.body as last_message_body,
      coalesce(jsonb_array_length(lm.attachments) > 0, false) as last_message_has_attachment,
      (
        select count(*)::integer from public.messages m
        where m.conversation_id = c.id and m.deleted_at is null
          and m.sender_business_id is null
          and m.sender_id is distinct from (select auth.uid())
          and m.created_at > coalesce((
            select p.last_read_at from public.conversation_participants p
            where p.conversation_id = c.id and p.user_id = (select auth.uid())
          ), '-infinity'::timestamptz)
      ) as unread
    from convs c
    left join public.bookings b on b.id = c.booking_id
    left join public.profiles pr on pr.id = c.created_by
    left join lateral (
      select m.body, m.attachments from public.messages m
      where m.conversation_id = c.id and m.deleted_at is null
      order by m.created_at desc limit 1
    ) lm on true
  )
  select e.conversation_id, e.booking_id, e.listing_id, l.title,
         (select m.url from public.listing_media m where m.listing_id = e.listing_id order by m.sort_order limit 1),
         e.guest_id, e.guest_name, e.guest_avatar_url,
         e.guest_city, e.last_message_at, e.last_message_body, e.last_message_has_attachment, e.unread
  from enriched e
  left join public.listings l on l.id = e.listing_id
  where (not p_unread_only or e.unread > 0)
    and (
      p_search is null or btrim(p_search) = ''
      or e.guest_name ilike '%' || btrim(p_search) || '%'
      or l.title ilike '%' || btrim(p_search) || '%'
      or e.last_message_body ilike '%' || btrim(p_search) || '%'
    )
  order by e.last_message_at desc nulls last
  limit least(greatest(p_limit, 1), 200);
end;
$$;

revoke execute on function public.business_inbox(uuid, text, boolean, timestamptz, integer) from public, anon;
grant execute on function public.business_inbox(uuid, text, boolean, timestamptz, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Insights
-- ---------------------------------------------------------------------------
-- p_period: 'weekly' (last 7 days by day), 'monthly' (last 4 weeks by week),
-- 'yearly' (last 12 months by month). Days are Asia/Karachi days.
create function public.business_insights(p_business_id uuid, p_period text default 'weekly')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_now timestamptz := now();
  v_today date;
  v_step interval;
  v_count integer;
  v_from timestamptz;
  v_prev_from timestamptz;
  v_is_owner boolean;
  v_result jsonb;
begin
  if not (private.is_business_member(p_business_id) or private.is_super_admin()) then
    raise exception 'Business not found' using errcode = 'P0002';
  end if;
  v_is_owner := private.is_business_owner(p_business_id) or private.is_super_admin();

  select b.timezone into v_tz from public.businesses b where b.id = p_business_id;
  v_today := (v_now at time zone v_tz)::date;

  if p_period = 'yearly' then
    v_step := interval '1 month';
    v_count := 12;
    v_from := (date_trunc('month', v_today::timestamp) - interval '11 months') at time zone v_tz;
  elsif p_period = 'monthly' then
    v_step := interval '7 days';
    v_count := 4;
    v_from := ((v_today - 27)::timestamp) at time zone v_tz;
  else
    v_step := interval '1 day';
    v_count := 7;
    v_from := ((v_today - 6)::timestamp) at time zone v_tz;
  end if;
  v_prev_from := ((v_from at time zone v_tz) - v_step * v_count) at time zone v_tz;

  with buckets as (
    select g as i,
           ((v_from at time zone v_tz) + v_step * g) at time zone v_tz as starts_at,
           ((v_from at time zone v_tz) + v_step * (g + 1)) at time zone v_tz as ends_at
    from generate_series(0, v_count - 1) g
  ),
  booking_series as (
    select bk.i, bk.starts_at, count(b.id)::integer as value
    from buckets bk
    left join public.bookings b on b.business_id = p_business_id
      and b.created_at >= bk.starts_at and b.created_at < bk.ends_at
    group by bk.i, bk.starts_at
  ),
  view_series as (
    select bk.i, bk.starts_at, count(v.id)::integer as value
    from buckets bk
    left join public.listing_views v on v.business_id = p_business_id
      and v.viewed_at >= bk.starts_at and v.viewed_at < bk.ends_at
    group by bk.i, bk.starts_at
  ),
  revenue_series as (
    select bk.i, bk.starts_at, coalesce(sum(p.amount - p.platform_fee_amount), 0)::bigint as value
    from buckets bk
    left join public.payments p on p.business_id = p_business_id and p.status = 'succeeded'
      and p.created_at >= bk.starts_at and p.created_at < bk.ends_at
    group by bk.i, bk.starts_at
  ),
  totals as (
    select
      (select count(*) from public.listing_views v where v.business_id = p_business_id
        and v.viewed_at >= v_from) as views_now,
      (select count(*) from public.listing_views v where v.business_id = p_business_id
        and v.viewed_at >= v_prev_from and v.viewed_at < v_from) as views_prev,
      (select coalesce(sum(p.amount - p.platform_fee_amount), 0) from public.payments p
        where p.business_id = p_business_id and p.status = 'succeeded' and p.created_at >= v_from) as revenue_now,
      (select coalesce(sum(p.amount - p.platform_fee_amount), 0) from public.payments p
        where p.business_id = p_business_id and p.status = 'succeeded'
          and p.created_at >= v_prev_from and p.created_at < v_from) as revenue_prev,
      (select count(*) from public.bookings b where b.business_id = p_business_id and b.created_at >= v_from) as bookings_now,
      (select count(*) from public.bookings b where b.business_id = p_business_id
        and b.created_at >= v_prev_from and b.created_at < v_from) as bookings_prev
  )
  select jsonb_build_object(
    'period', coalesce(nullif(p_period, ''), 'weekly'),
    'from', v_from,
    'timezone', v_tz,
    'bookings', jsonb_build_object(
      'series', (select jsonb_agg(jsonb_build_object('start', s.starts_at, 'value', s.value) order by s.i) from booking_series s),
      'total', (select t.bookings_now from totals t),
      'previous', (select t.bookings_prev from totals t)
    ),
    'views', jsonb_build_object(
      'series', (select jsonb_agg(jsonb_build_object('start', s.starts_at, 'value', s.value) order by s.i) from view_series s),
      'total', (select t.views_now from totals t),
      'previous', (select t.views_prev from totals t)
    ),
    'revenue', case when v_is_owner then jsonb_build_object(
      'series', (select jsonb_agg(jsonb_build_object('start', s.starts_at, 'value', s.value) order by s.i) from revenue_series s),
      'total', (select t.revenue_now from totals t),
      'previous', (select t.revenue_prev from totals t)
    ) end,
    -- Collected for the business, minus refunds and payouts already made or on the way.
    'wallet', case when v_is_owner then jsonb_build_object(
      'balance', greatest(0,
        (select coalesce(sum(p.amount - p.platform_fee_amount), 0) from public.payments p
          where p.business_id = p_business_id and p.status = 'succeeded' and p.collected_by = 'platform_collect')
        - (select coalesce(sum(r.amount), 0) from public.refunds r
            join public.payments p on p.id = r.payment_id
            where p.business_id = p_business_id and r.status = 'succeeded' and p.collected_by = 'platform_collect')
        - (select coalesce(sum(po.amount), 0) from public.payouts po
            where po.business_id = p_business_id and po.status in ('pending', 'processing', 'paid'))
      ),
      'currency', (select b.currency from public.businesses b where b.id = p_business_id)
    ) end,
    'rating', jsonb_build_object(
      'average', (select b.rating_avg from public.businesses b where b.id = p_business_id),
      'count', (select b.rating_count from public.businesses b where b.id = p_business_id),
      -- Monthly average of published reviews, last 6 months (months without reviews are skipped).
      'trend', (
        select coalesce(jsonb_agg(jsonb_build_object('month', m.month, 'average', m.avg) order by m.month), '[]'::jsonb)
        from (
          select date_trunc('month', r.created_at at time zone v_tz) as month, round(avg(r.rating), 2) as avg
          from public.reviews r
          where r.business_id = p_business_id and r.status = 'published'
            and r.created_at >= ((date_trunc('month', v_today::timestamp) - interval '5 months') at time zone v_tz)
          group by 1
        ) m
      )
    ),
    'categories', (
      select coalesce(jsonb_agg(jsonb_build_object('slug', x.slug, 'name', x.name, 'count', x.n) order by x.n desc), '[]'::jsonb)
      from (
        select coalesce(g.slug, c.slug, 'other') as slug, coalesce(g.name, c.name, 'Other') as name, count(*)::integer as n
        from public.bookings b
        join public.listings l on l.id = b.listing_id
        left join public.categories c on c.id = l.category_id
        left join public.categories g on g.id = c.parent_id
        where b.business_id = p_business_id
        group by 1, 2
      ) x
    ),
    'newly_added', (
      select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'title', x.title, 'city', x.city, 'views', x.views,
        'published_at', x.published_at, 'cover', x.cover) order by x.published_at desc), '[]'::jsonb)
      from (
        select l.id, l.title, l.city, l.published_at,
               (select m.url from public.listing_media m where m.listing_id = l.id order by m.sort_order limit 1) as cover,
               (select count(*)::integer from public.listing_views v where v.listing_id = l.id) as views
        from public.listings l
        where l.business_id = p_business_id and l.status = 'published'
        order by l.published_at desc nulls last limit 2
      ) x
    ),
    'most_viewed', (
      select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'title', x.title, 'city', x.city, 'views', x.views,
        'cover', x.cover) order by x.views desc), '[]'::jsonb)
      from (
        select l.id, l.title, l.city,
               (select m.url from public.listing_media m where m.listing_id = l.id order by m.sort_order limit 1) as cover,
               (select count(*)::integer from public.listing_views v where v.listing_id = l.id) as views
        from public.listings l
        where l.business_id = p_business_id and l.status = 'published'
        order by 5 desc limit 3
      ) x
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.business_insights(uuid, text) from public, anon;
grant execute on function public.business_insights(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- "Message guest" from a reservation
-- ---------------------------------------------------------------------------
-- A team member opens (or resumes) the chat with the guest of a reservation,
-- the same conversation the guest sees in the app. The guest is a participant.
create function public.start_guest_conversation(p_booking_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_conversation public.conversations;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found or not private.is_business_member(v_booking.business_id) then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  select c.* into v_conversation from public.conversations c
  where c.type = 'business' and c.business_id = v_booking.business_id and c.booking_id = v_booking.id
  limit 1;

  if not found then
    insert into public.conversations (type, business_id, booking_id, created_by)
    values ('business', v_booking.business_id, v_booking.id, v_booking.consumer_id)
    returning * into v_conversation;
    insert into public.conversation_participants (conversation_id, user_id)
    values (v_conversation.id, v_booking.consumer_id)
    on conflict do nothing;
  end if;

  insert into public.conversation_participants (conversation_id, user_id, last_read_at)
  values (v_conversation.id, (select auth.uid()), now())
  on conflict do nothing;
  return v_conversation;
end;
$$;

revoke execute on function public.start_guest_conversation(uuid) from public, anon;
grant execute on function public.start_guest_conversation(uuid) to authenticated;
