-- Membership plans (business or Moment platform), memberships, coupons, redemptions.

-- ---------------------------------------------------------------------------
-- Membership plans: business_id null = Moment platform plan
-- ---------------------------------------------------------------------------
create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  price_amount integer not null check (price_amount >= 0),
  currency char(3) not null default 'PKR',
  interval public.membership_interval not null,
  -- e.g. {"discount_percent": 10, "included_sessions": 2, "perks": ["Priority booking"]}
  benefits jsonb not null default '{}',
  included_sessions integer check (included_sessions > 0), -- per period
  discount_percent smallint check (discount_percent between 0 and 100),
  provider text check (provider ~ '^[a-z0-9_]+$'),
  provider_plan_ref text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index membership_plans_business_idx on public.membership_plans (business_id);

create trigger membership_plans_updated_at before update on public.membership_plans
  for each row execute function private.set_updated_at();

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.membership_plans (id) on delete restrict,
  business_id uuid references public.businesses (id) on delete cascade, -- copied from plan
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.membership_status not null default 'active',
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  sessions_remaining integer check (sessions_remaining >= 0),
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  provider text check (provider ~ '^[a-z0-9_]+$'),
  provider_subscription_ref text,
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index memberships_user_idx on public.memberships (user_id, status);
create index memberships_plan_idx on public.memberships (plan_id);
create index memberships_business_idx on public.memberships (business_id);
-- One live membership per user per plan.
create unique index memberships_one_active_idx on public.memberships (user_id, plan_id)
  where status in ('active', 'past_due');

create trigger memberships_updated_at before update on public.memberships
  for each row execute function private.set_updated_at();

create function private.memberships_set_business()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.business_id into new.business_id from public.membership_plans p where p.id = new.plan_id;
  return new;
end;
$$;

create trigger memberships_set_business before insert or update of plan_id on public.memberships
  for each row execute function private.memberships_set_business();

alter table public.bookings
  add constraint bookings_membership_fk foreign key (membership_id) references public.memberships (id) on delete set null;
alter table public.payments
  add constraint payments_membership_fk foreign key (membership_id) references public.memberships (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Coupons: business_id null = platform coupon
-- ---------------------------------------------------------------------------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  code extensions.citext not null check (code ~ '^[A-Za-z0-9_-]{3,32}$'),
  title text not null,
  description text,
  discount_type public.discount_type not null,
  discount_value integer not null check (discount_value > 0), -- percent (1-100) or minor units
  max_discount_amount integer check (max_discount_amount > 0),
  min_subtotal_amount integer not null default 0 check (min_subtotal_amount >= 0),
  currency char(3) not null default 'PKR',
  listing_ids uuid[], -- null = every listing in scope
  max_redemptions integer check (max_redemptions > 0),
  per_user_limit integer default 1 check (per_user_limit > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_public boolean not null default false, -- shown on the Offers screen
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create unique index coupons_code_idx on public.coupons (coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(code::text));
create index coupons_business_idx on public.coupons (business_id);
create index coupons_public_idx on public.coupons (ends_at) where is_public and is_active;
create index coupons_created_by_idx on public.coupons (created_by);

create trigger coupons_updated_at before update on public.coupons
  for each row execute function private.set_updated_at();

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  discount_amount integer not null check (discount_amount >= 0),
  created_at timestamptz not null default now()
);
create index coupon_redemptions_coupon_idx on public.coupon_redemptions (coupon_id);
create index coupon_redemptions_user_idx on public.coupon_redemptions (user_id, coupon_id);
create index coupon_redemptions_business_idx on public.coupon_redemptions (business_id);

alter table public.bookings
  add constraint bookings_coupon_fk foreign key (coupon_id) references public.coupons (id) on delete set null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

create policy "plans: public read active" on public.membership_plans
  for select to anon, authenticated
  using (is_active and (business_id is null or (select private.is_business_active(business_id))));
create policy "plans: members and admins read" on public.membership_plans
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "plans: managers manage business plans, admins all" on public.membership_plans
  for all to authenticated
  using ((business_id is not null and (select private.is_business_manager(business_id))) or (select private.is_super_admin()))
  with check ((business_id is not null and (select private.is_business_manager(business_id))) or (select private.is_super_admin()));

-- Paid memberships are created by backend code after payment. Businesses can
-- grant memberships sold in person (POS, cash) for their own plans.
create policy "memberships: own, business and admins read" on public.memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (business_id is not null and (select private.is_business_member(business_id)))
    or (select private.is_super_admin())
  );
create policy "memberships: managers manage business memberships, admins all" on public.memberships
  for all to authenticated
  using ((business_id is not null and (select private.is_business_manager(business_id))) or (select private.is_super_admin()))
  with check ((business_id is not null and (select private.is_business_manager(business_id))) or (select private.is_super_admin()));

-- Consumers only see public coupons, so private codes cannot be listed.
create policy "coupons: signed-in users read public offers" on public.coupons
  for select to authenticated
  using (
    is_public and is_active and (ends_at is null or ends_at > now())
    and (business_id is null or (select private.is_business_active(business_id)))
  );
create policy "coupons: members and admins read" on public.coupons
  for select to authenticated
  using ((business_id is not null and (select private.is_business_member(business_id))) or (select private.is_super_admin()));
create policy "coupons: managers manage business coupons, admins all" on public.coupons
  for all to authenticated
  using ((business_id is not null and (select private.is_business_manager(business_id))) or (select private.is_super_admin()))
  with check ((business_id is not null and (select private.is_business_manager(business_id))) or (select private.is_super_admin()));

-- Redemptions are written by create_booking.
create policy "redemptions: own, business and admins read" on public.coupon_redemptions
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (business_id is not null and (select private.is_business_member(business_id)))
    or (select private.is_super_admin())
  );
