-- Provider-agnostic payments, refunds, payout accounts, payouts and wallet.
-- No provider is assumed. Every money movement records:
--   provider                 slug, e.g. jazzcash, easypaisa, safepay, payfast, bank_transfer, cash, manual
--   provider_transaction_ref the provider's transaction ID
--   provider_account_ref     the merchant account that received the money
-- The payout model (direct vs platform_collect) is chosen per payment via
-- collected_by, so both models can coexist while the decision is open.

-- ---------------------------------------------------------------------------
-- Payout accounts: where a business receives money (owner only)
-- ---------------------------------------------------------------------------
create table public.payout_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  provider text not null check (provider ~ '^[a-z0-9_]+$'),
  provider_account_ref text, -- merchant ID, wallet number or account reference at the provider
  account_title text not null,
  bank_name text,
  account_number_last4 text check (account_number_last4 ~ '^[0-9]{4}$'),
  iban_masked text, -- e.g. PK36 **** **** **** 1234; never store the full IBAN here
  is_default boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);
create index payout_accounts_business_idx on public.payout_accounts (business_id);
create unique index payout_accounts_one_default_idx on public.payout_accounts (business_id) where is_default;

create trigger payout_accounts_updated_at before update on public.payout_accounts
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Payment customers: a user's customer reference at a provider
-- ---------------------------------------------------------------------------
create table public.payment_customers (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider ~ '^[a-z0-9_]+$'),
  provider_customer_ref text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, provider)
);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  -- null only for Moment platform revenue (platform membership plans)
  business_id uuid references public.businesses (id) on delete restrict,
  booking_id uuid,
  membership_id uuid, -- FK added with memberships
  payer_id uuid references auth.users (id) on delete set null,
  amount integer not null check (amount > 0),
  currency char(3) not null default 'PKR',
  platform_fee_amount integer not null default 0 check (platform_fee_amount >= 0),
  collected_by public.payout_model not null,
  provider text not null check (provider ~ '^[a-z0-9_]+$'),
  provider_transaction_ref text,
  provider_account_ref text,
  method text, -- card, wallet, bank_transfer, cash, ...
  method_summary text, -- e.g. "JazzCash 0300 ***4567", "Visa **** 4242"
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}',
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (platform_fee_amount <= amount),
  check (booking_id is not null or membership_id is not null),
  check (booking_id is null or business_id is not null),
  unique (business_id, id),
  foreign key (business_id, booking_id) references public.bookings (business_id, id)
);
create unique index payments_provider_ref_idx on public.payments (provider, provider_transaction_ref)
  where provider_transaction_ref is not null;
create index payments_business_idx on public.payments (business_id, created_at desc);
create index payments_booking_idx on public.payments (booking_id);
create index payments_membership_idx on public.payments (membership_id);
create index payments_payer_idx on public.payments (payer_id);
create index payments_recorded_by_idx on public.payments (recorded_by);

create trigger payments_updated_at before update on public.payments
  for each row execute function private.set_updated_at();

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  business_id uuid, -- copied from the payment; null for platform payments
  payment_id uuid not null references public.payments (id) on delete restrict,
  amount integer not null check (amount > 0),
  currency char(3) not null default 'PKR',
  provider_refund_ref text,
  reason text,
  status public.refund_status not null default 'pending',
  to_wallet boolean not null default false, -- refunded as Moment wallet credit
  requested_by uuid references auth.users (id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id, payment_id) references public.payments (business_id, id)
);
create index refunds_payment_idx on public.refunds (payment_id);
create index refunds_business_idx on public.refunds (business_id);
create index refunds_requested_by_idx on public.refunds (requested_by);

create trigger refunds_updated_at before update on public.refunds
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Payouts (platform_collect model: Moment pays businesses)
-- ---------------------------------------------------------------------------
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict,
  payout_account_id uuid,
  amount integer not null check (amount >= 0),
  currency char(3) not null default 'PKR',
  period_start date,
  period_end date,
  status public.payout_status not null default 'pending',
  provider text check (provider ~ '^[a-z0-9_]+$'),
  provider_payout_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, payout_account_id) references public.payout_accounts (business_id, id)
);
create index payouts_business_idx on public.payouts (business_id, created_at desc);
create index payouts_account_idx on public.payouts (payout_account_id);

create trigger payouts_updated_at before update on public.payouts
  for each row execute function private.set_updated_at();

create table public.payout_items (
  payout_id uuid not null,
  business_id uuid not null,
  payment_id uuid not null,
  gross_amount integer not null,
  fee_amount integer not null default 0,
  refund_amount integer not null default 0,
  net_amount integer not null,
  primary key (payout_id, payment_id),
  foreign key (business_id, payout_id) references public.payouts (business_id, id) on delete cascade,
  foreign key (business_id, payment_id) references public.payments (business_id, id)
);
-- A payment is paid out at most once.
create unique index payout_items_payment_idx on public.payout_items (payment_id);
create index payout_items_business_idx on public.payout_items (business_id);

-- ---------------------------------------------------------------------------
-- Wallet (in-app credit ledger)
-- ---------------------------------------------------------------------------
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.wallet_transaction_type not null,
  amount integer not null check (amount <> 0), -- positive = credit, negative = debit
  currency char(3) not null default 'PKR',
  description text,
  booking_id uuid references public.bookings (id) on delete set null,
  refund_id uuid references public.refunds (id) on delete set null,
  created_at timestamptz not null default now()
);
create index wallet_transactions_user_idx on public.wallet_transactions (user_id, created_at desc);
create index wallet_transactions_booking_idx on public.wallet_transactions (booking_id);
create index wallet_transactions_refund_idx on public.wallet_transactions (refund_id);

create view public.wallet_balances
with (security_invoker = true)
as
  select user_id, currency, sum(amount)::integer as balance
  from public.wallet_transactions
  group by user_id, currency;

-- ---------------------------------------------------------------------------
-- Keep bookings.payment_status in sync
-- ---------------------------------------------------------------------------
create function private.sync_booking_payment_status(p_booking_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.bookings b
  set payment_status = case
    when t.paid = 0 then 'unpaid'::public.booking_payment_status
    when t.refunded >= t.paid then 'refunded'::public.booking_payment_status
    when t.refunded > 0 then 'partially_refunded'::public.booking_payment_status
    when t.paid >= b.total_amount then 'paid'::public.booking_payment_status
    else 'partially_paid'::public.booking_payment_status
  end
  from (
    select
      coalesce(sum(p.amount) filter (where p.status = 'succeeded'), 0) as paid,
      coalesce((
        select sum(r.amount) from public.refunds r
        join public.payments p2 on p2.id = r.payment_id
        where p2.booking_id = p_booking_id and r.status = 'succeeded'
      ), 0) as refunded
    from public.payments p
    where p.booking_id = p_booking_id
  ) t
  where b.id = p_booking_id;
$$;

create function private.payments_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking_id uuid;
begin
  if tg_table_name = 'payments' then
    v_booking_id := new.booking_id;
    if new.status = 'succeeded' and new.paid_at is null then
      update public.payments set paid_at = now() where id = new.id;
    end if;
  else
    select booking_id into v_booking_id from public.payments where id = new.payment_id;
  end if;
  if v_booking_id is not null then
    perform private.sync_booking_payment_status(v_booking_id);
  end if;
  return null;
end;
$$;

create trigger payments_changed after insert or update of status, amount on public.payments
  for each row execute function private.payments_changed();
create trigger refunds_changed after insert or update of status, amount on public.refunds
  for each row execute function private.payments_changed();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Provider-backed payments are written by backend code (service role, bypasses
-- RLS). Businesses may record cash or manual payments themselves (POS, walk-ins).
alter table public.payout_accounts enable row level security;
alter table public.payment_customers enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.payouts enable row level security;
alter table public.payout_items enable row level security;
alter table public.wallet_transactions enable row level security;

create policy "payout_accounts: owners and admins" on public.payout_accounts
  for all to authenticated
  using ((select private.is_business_owner(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_owner(business_id)) or (select private.is_super_admin()));

create policy "payment_customers: own or admin read" on public.payment_customers
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()));

create policy "payments: payer, business and admins read" on public.payments
  for select to authenticated
  using (
    payer_id = (select auth.uid())
    or (select private.is_business_member(business_id))
    or (select private.is_super_admin())
  );
create policy "payments: business records cash or manual" on public.payments
  for insert to authenticated
  with check (
    (select private.is_business_member(business_id))
    and provider in ('cash', 'manual')
    and collected_by = 'direct'
    and platform_fee_amount = 0
    and recorded_by = (select auth.uid())
  );
create policy "payments: admins manage" on public.payments
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create function private.can_read_payment(p_payment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.payments p
    where p.id = p_payment_id
      and (p.payer_id = (select auth.uid()) or private.is_business_member(p.business_id) or private.is_super_admin())
  );
$$;

create policy "refunds: readable with the payment" on public.refunds
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.can_read_payment(payment_id)));
create policy "refunds: admins manage" on public.refunds
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create policy "payouts: owners and admins read" on public.payouts
  for select to authenticated
  using ((select private.is_business_owner(business_id)) or (select private.is_super_admin()));
create policy "payouts: admins manage" on public.payouts
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create policy "payout_items: owners and admins read" on public.payout_items
  for select to authenticated
  using ((select private.is_business_owner(business_id)) or (select private.is_super_admin()));
create policy "payout_items: admins manage" on public.payout_items
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create policy "wallet: own or admin read" on public.wallet_transactions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()));
create policy "wallet: admins manage" on public.wallet_transactions
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
