-- Reviews: one per completed booking, with business replies and rating aggregates.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique,
  business_id uuid not null,
  listing_id uuid not null,
  staff_id uuid,
  author_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text check (char_length(body) <= 2000),
  photos text[] not null default '{}',
  status public.review_status not null default 'published',
  business_reply text check (char_length(business_reply) <= 1000),
  replied_at timestamptz,
  replied_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id, booking_id) references public.bookings (business_id, id) on delete cascade,
  foreign key (business_id, listing_id) references public.listings (business_id, id) on delete cascade,
  foreign key (business_id, staff_id) references public.staff_members (business_id, id) on delete set null (staff_id)
);
create index reviews_listing_published_idx on public.reviews (listing_id, created_at desc) where status = 'published';
create index reviews_business_idx on public.reviews (business_id, created_at desc);
create index reviews_staff_idx on public.reviews (staff_id);
create index reviews_author_idx on public.reviews (author_id);
create index reviews_replied_by_idx on public.reviews (replied_by);

create trigger reviews_updated_at before update on public.reviews
  for each row execute function private.set_updated_at();

-- Fill business, listing and staff from the booking; protect moderated fields.
create function private.reviews_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  if tg_op = 'INSERT' then
    select * into v_booking from public.bookings where id = new.booking_id;
    new.business_id := v_booking.business_id;
    new.listing_id := v_booking.listing_id;
    new.staff_id := v_booking.staff_id;
    if private.is_client_request() then
      new.status := 'published';
      new.business_reply := null;
      new.replied_at := null;
      new.replied_by := null;
    end if;
  elsif private.is_client_request() then
    -- Authors may edit rating, body and photos only. Replies go through reply_to_review.
    new.booking_id := old.booking_id;
    new.business_id := old.business_id;
    new.listing_id := old.listing_id;
    new.staff_id := old.staff_id;
    new.author_id := old.author_id;
    new.status := old.status;
    new.business_reply := old.business_reply;
    new.replied_at := old.replied_at;
    new.replied_by := old.replied_by;
  end if;
  return new;
end;
$$;

create trigger reviews_before_write before insert or update on public.reviews
  for each row execute function private.reviews_before_write();

-- Recompute ratings for the listing, business and staff member.
create function private.refresh_ratings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select distinct x.listing_id, x.business_id, x.staff_id
    from (
      select new.listing_id, new.business_id, new.staff_id where tg_op <> 'DELETE'
      union all
      select old.listing_id, old.business_id, old.staff_id where tg_op <> 'INSERT'
    ) x
  loop
    update public.listings l
    set rating_avg = coalesce(s.avg, 0), rating_count = s.cnt
    from (select round(avg(rating), 2) as avg, count(*)::int as cnt
          from public.reviews where listing_id = r.listing_id and status = 'published') s
    where l.id = r.listing_id;

    update public.businesses b
    set rating_avg = coalesce(s.avg, 0), rating_count = s.cnt
    from (select round(avg(rating), 2) as avg, count(*)::int as cnt
          from public.reviews where business_id = r.business_id and status = 'published') s
    where b.id = r.business_id;

    if r.staff_id is not null then
      update public.staff_members m
      set rating_avg = coalesce(s.avg, 0), rating_count = s.cnt
      from (select round(avg(rating), 2) as avg, count(*)::int as cnt
            from public.reviews where staff_id = r.staff_id and status = 'published') s
      where m.id = r.staff_id;
    end if;

    perform private.refresh_listing_stats(r.listing_id);
  end loop;
  return null;
end;
$$;

create trigger reviews_refresh_ratings after insert or update of rating, status or delete on public.reviews
  for each row execute function private.refresh_ratings();

-- Business replies.
create function public.reply_to_review(p_review_id uuid, p_reply text)
returns public.reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.reviews;
  v_uid uuid := (select auth.uid());
begin
  select * into v_review from public.reviews where id = p_review_id;
  if not found or not (private.is_business_member(v_review.business_id) or private.is_super_admin()) then
    raise exception 'Review not found' using errcode = 'P0002';
  end if;

  update public.reviews
  set business_reply = nullif(trim(p_reply), ''),
      replied_at = case when nullif(trim(p_reply), '') is null then null else now() end,
      replied_by = case when nullif(trim(p_reply), '') is null then null else v_uid end
  where id = p_review_id
  returning * into v_review;
  return v_review;
end;
$$;

revoke execute on function public.reply_to_review from anon;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.reviews enable row level security;

create policy "reviews: public read published" on public.reviews
  for select to anon, authenticated
  using (status = 'published');
create policy "reviews: author, business and admins read" on public.reviews
  for select to authenticated
  using (
    author_id = (select auth.uid())
    or (select private.is_business_member(business_id))
    or (select private.is_super_admin())
  );
create policy "reviews: authors review their completed bookings" on public.reviews
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.consumer_id = (select auth.uid()) and b.status = 'completed'
    )
  );
create policy "reviews: authors edit, admins moderate" on public.reviews
  for update to authenticated
  using (author_id = (select auth.uid()) or (select private.is_super_admin()))
  with check (author_id = (select auth.uid()) or (select private.is_super_admin()));
create policy "reviews: authors and admins delete" on public.reviews
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.is_super_admin()));
