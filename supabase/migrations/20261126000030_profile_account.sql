-- Profile screens (Figma "Profile Screens"): personal information fields that
-- had no column, privacy and sharing choices, identity verification state,
-- saved payment methods, saved coupons (Offers > Apply), notifications for
-- booking and payment events, and public app config (referral reward, social
-- links, support contact, store links).

-- ---------------------------------------------------------------------------
-- Personal information and privacy
-- ---------------------------------------------------------------------------
alter table public.profile_private
  add column pronouns text check (pronouns is null or char_length(pronouns) between 1 and 30),
  add column emergency_contact_name text check (emergency_contact_name is null or char_length(emergency_contact_name) between 1 and 80),
  add column emergency_contact_relation text check (emergency_contact_relation is null or char_length(emergency_contact_relation) between 1 and 40),
  add column emergency_contact_phone text check (emergency_contact_phone is null or emergency_contact_phone ~ '^\+92[0-9]{10}$'),
  add column privacy_prefs jsonb not null default '{"profile_public": true, "likes_visible_to_groups": true, "bookings_visible_to_hosts": true}',
  add constraint profile_private_emergency_contact_complete check (
    num_nonnulls(emergency_contact_name, emergency_contact_phone) in (0, 2)
  );

comment on column public.profile_private.pronouns is 'Edit personal info > Pronouns (free text from a picker: she/her, he/him, they/them, ...).';
comment on column public.profile_private.privacy_prefs is 'Privacy & Sharing toggles. Stored only; enforcement is listed in docs/ROADMAP.md.';

-- Verified tick on Show profile. Set by Moment after checking the CNIC; users cannot set it.
alter table public.profiles add column identity_verified_at timestamptz;

-- ---------------------------------------------------------------------------
-- Saved payment methods (Payment method screen)
-- ---------------------------------------------------------------------------
-- Only display details are stored. The provider token comes from the payment
-- provider's SDK (mocked until a provider is chosen); card numbers never reach us.
create table public.saved_payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  method text not null check (method in ('card', 'jazzcash', 'easypaisa')),
  brand text check (brand is null or char_length(brand) <= 20),
  last4 text not null check (last4 ~ '^[0-9]{4}$'),
  exp_month smallint check (exp_month between 1 and 12),
  exp_year smallint check (exp_year between 2000 and 2100),
  holder_name text check (holder_name is null or char_length(holder_name) <= 80),
  provider text check (provider ~ '^[a-z0-9_]+$'),
  provider_token text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  check ((method = 'card') = (exp_month is not null and exp_year is not null))
);
create index saved_payment_methods_user_idx on public.saved_payment_methods (user_id, created_at desc);
create unique index saved_payment_methods_one_default_idx on public.saved_payment_methods (user_id) where is_default;

-- The first method becomes the default; removing the default promotes the newest.
create function private.saved_payment_methods_first_default()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.saved_payment_methods where user_id = new.user_id and is_default) then
    new.is_default := true;
  elsif new.is_default then
    update public.saved_payment_methods set is_default = false where user_id = new.user_id and is_default;
  end if;
  return new;
end;
$$;

create trigger saved_payment_methods_first_default before insert on public.saved_payment_methods
  for each row execute function private.saved_payment_methods_first_default();

create function private.saved_payment_methods_promote_default()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_default then
    update public.saved_payment_methods set is_default = true
    where id = (
      select id from public.saved_payment_methods
      where user_id = old.user_id
      order by created_at desc
      limit 1
    );
  end if;
  return null;
end;
$$;

create trigger saved_payment_methods_promote_default after delete on public.saved_payment_methods
  for each row execute function private.saved_payment_methods_promote_default();

alter table public.saved_payment_methods enable row level security;

create policy "saved_payment_methods: own read" on public.saved_payment_methods
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "saved_payment_methods: own add" on public.saved_payment_methods
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "saved_payment_methods: own remove" on public.saved_payment_methods
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- "Set as default": one statement, so the one-default index holds.
create function public.set_default_payment_method(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if not exists (select 1 from public.saved_payment_methods where id = p_id and user_id = v_user) then
    raise exception 'Payment method not found' using errcode = 'P0002';
  end if;
  update public.saved_payment_methods set is_default = false where user_id = v_user and is_default and id <> p_id;
  update public.saved_payment_methods set is_default = true where id = p_id;
end;
$$;
revoke execute on function public.set_default_payment_method(uuid) from public, anon;
grant execute on function public.set_default_payment_method(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Saved coupons (Offers > Apply; Confirm Reservation pre-applies one)
-- ---------------------------------------------------------------------------
create table public.saved_coupons (
  user_id uuid not null references auth.users (id) on delete cascade,
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, coupon_id)
);
create index saved_coupons_coupon_idx on public.saved_coupons (coupon_id);

alter table public.saved_coupons enable row level security;

create policy "saved_coupons: own read" on public.saved_coupons
  for select to authenticated
  using (user_id = (select auth.uid()));
-- Only offers the user can see (public, active) can be saved.
create policy "saved_coupons: own save public offers" on public.saved_coupons
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.coupons c where c.id = coupon_id and c.is_public and c.is_active)
  );
create policy "saved_coupons: own remove" on public.saved_coupons
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Notifications for booking and payment events
-- ---------------------------------------------------------------------------
create function private.booking_label(p_booking public.bookings)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select l.title from public.listings l where l.id = p_booking.listing_id),
    (select b.name from public.businesses b where b.id = p_booking.business_id),
    'your booking'
  );
$$;

create function private.notify_booking_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text := private.booking_label(new);
  v_type text;
  v_title text;
  v_body text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return null;
  end if;

  case new.status
    when 'pending' then
      v_type := 'booking_requested'; v_title := 'Booking requested';
      v_body := v_label || ' is waiting for the host to confirm.';
    when 'confirmed' then
      v_type := 'booking_confirmed'; v_title := 'Booking confirmed';
      v_body := v_label || ' is confirmed.';
    when 'completed' then
      v_type := 'booking_completed'; v_title := 'How was it?';
      v_body := 'Tell others about ' || v_label || '. Leave a review.';
    when 'cancelled_by_business' then
      v_type := 'booking_cancelled'; v_title := 'Booking cancelled';
      v_body := v_label || ' was cancelled by the host.';
    when 'cancelled_by_consumer' then
      v_type := 'booking_cancelled'; v_title := 'Booking cancelled';
      v_body := 'You cancelled ' || v_label || '.';
    else
      return null;
  end case;

  insert into public.notifications (user_id, type, title, body, data)
  values (new.consumer_id, v_type, v_title, v_body,
          jsonb_build_object('screen', 'booking', 'booking_id', new.id));
  return null;
end;
$$;

create trigger bookings_notify after insert or update of status on public.bookings
  for each row execute function private.notify_booking_event();

create function private.notify_payment_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'succeeded' or new.payer_id is null
     or (tg_op = 'UPDATE' and old.status = 'succeeded') then
    return null;
  end if;
  insert into public.notifications (user_id, type, title, body, data)
  values (
    new.payer_id, 'payment_received', 'Payment received',
    'We received ' || case when new.currency = 'PKR' then 'Rs ' else new.currency || ' ' end || to_char(new.amount / 100.0, 'FM999,999,990') || '.',
    jsonb_build_object('screen', case when new.booking_id is null then 'wallet' else 'booking' end, 'booking_id', new.booking_id)
  );
  return null;
end;
$$;

create trigger payments_notify after insert or update of status on public.payments
  for each row execute function private.notify_payment_event();

create function private.notify_refund_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
begin
  if new.status <> 'succeeded' or (tg_op = 'UPDATE' and old.status = 'succeeded') then
    return null;
  end if;
  select * into v_payment from public.payments where id = new.payment_id;
  if v_payment.payer_id is null then
    return null;
  end if;
  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_payment.payer_id, 'refund',
    case when new.to_wallet then 'Refund added to your wallet' else 'Refund on its way' end,
    case when new.currency = 'PKR' then 'Rs ' else new.currency || ' ' end || to_char(new.amount / 100.0, 'FM999,999,990')
      || case when new.to_wallet then ' is in your Moment wallet.' else ' is going back to your payment method.' end,
    jsonb_build_object('screen', case when new.to_wallet then 'wallet' else 'booking' end, 'booking_id', v_payment.booking_id)
  );
  return null;
end;
$$;

create trigger refunds_notify after insert or update of status on public.refunds
  for each row execute function private.notify_refund_event();

-- ---------------------------------------------------------------------------
-- Public app config (Invite friends, Follow us, Rate us, Contact support)
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, value, description, is_public) values
  ('referrals.reward_amount', '50000', 'Invite friends: what the friend and the referrer each get, PKR minor units.', true),
  ('app.social_links', '{"instagram": "https://www.instagram.com/moment.app", "facebook": "https://www.facebook.com/moment.app", "tiktok": "https://www.tiktok.com/@moment.app", "linkedin": "https://www.linkedin.com/company/moment-app", "x": "https://x.com/moment_app"}', 'Follow us links. Placeholders until the accounts exist.', true),
  ('app.support', '{"email": "support@moment.pk", "phone": "+924211112222", "hours": "Every day, 9am to 11pm"}', 'Contact Moment Support.', true),
  ('app.store_urls', '{"ios": "https://apps.apple.com/app/id0000000000", "android": "https://play.google.com/store/apps/details?id=pk.moment.app"}', 'Rate us fallback. Placeholder ids until the apps are listed.', true)
on conflict (key) do nothing;
