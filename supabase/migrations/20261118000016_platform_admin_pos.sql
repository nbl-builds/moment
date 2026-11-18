-- Platform settings, audit log, business API keys (POS and device integrations).

create table public.platform_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  description text,
  is_public boolean not null default false, -- readable by clients
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index platform_settings_updated_by_idx on public.platform_settings (updated_by);

create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  business_id uuid references public.businesses (id) on delete set null,
  action text not null, -- INSERT, UPDATE, DELETE
  entity_type text not null,
  entity_id text,
  changes jsonb, -- {"column": {"old": ..., "new": ...}}
  created_at timestamptz not null default now()
);
create index audit_log_business_idx on public.audit_log (business_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_actor_idx on public.audit_log (actor_id);

create function private.audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changes jsonb;
begin
  select jsonb_object_agg(k, jsonb_build_object('old', v_old -> k, 'new', v_new -> k))
  into v_changes
  from (
    select k from jsonb_object_keys(coalesce(v_new, '{}'::jsonb) || coalesce(v_old, '{}'::jsonb)) k
    where k not in ('updated_at', 'search_vector')
      and (v_old -> k) is distinct from (v_new -> k)
  ) diff;

  if tg_op = 'UPDATE' and v_changes is null then
    return null;
  end if;

  insert into public.audit_log (actor_id, business_id, action, entity_type, entity_id, changes)
  values (
    (select auth.uid()),
    -- On delete the business may be going away too; the id stays in changes.
    case when tg_op = 'DELETE' then null
         when tg_table_name = 'businesses' then (v_row ->> 'id')::uuid
         else (v_row ->> 'business_id')::uuid end,
    tg_op,
    tg_table_name,
    coalesce(v_row ->> 'id', concat_ws(':', v_row ->> 'business_id', v_row ->> 'user_id')),
    v_changes
  );
  return null;
end;
$$;

create trigger audit_businesses after insert or update or delete on public.businesses
  for each row execute function private.audit();
create trigger audit_business_private after update on public.business_private
  for each row execute function private.audit();
create trigger audit_business_members after insert or update or delete on public.business_members
  for each row execute function private.audit();
create trigger audit_payout_accounts after insert or update or delete on public.payout_accounts
  for each row execute function private.audit();
create trigger audit_listings after update of price_amount, status, price_unit, business_id or delete on public.listings
  for each row execute function private.audit();
create trigger audit_listing_options after insert or update of price_amount or delete on public.listing_options
  for each row execute function private.audit();

-- ---------------------------------------------------------------------------
-- Business API keys
-- ---------------------------------------------------------------------------
-- Keys are verified by an edge function (sha256 of the plaintext). The
-- plaintext is returned once by create_business_api_key and never stored.
create table public.business_api_keys (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  key_prefix text not null, -- shown in the portal, e.g. mk_live_ab12
  key_hash text not null unique,
  scopes text[] not null default '{bookings:read,bookings:write,listings:read}',
  created_by uuid references auth.users (id) on delete set null,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index business_api_keys_business_idx on public.business_api_keys (business_id);
create index business_api_keys_created_by_idx on public.business_api_keys (created_by);

create function public.create_business_api_key(
  p_business_id uuid,
  p_name text,
  p_scopes text[] default '{bookings:read,bookings:write,listings:read}'
)
returns table (id uuid, key_prefix text, api_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_id uuid;
  v_prefix text;
begin
  if not (private.is_business_owner(p_business_id) or private.is_super_admin()) then
    raise exception 'Only owners can create API keys' using errcode = '42501';
  end if;

  v_key := 'mk_' || encode(extensions.gen_random_bytes(24), 'hex');
  v_prefix := left(v_key, 11);

  insert into public.business_api_keys (business_id, name, key_prefix, key_hash, scopes, created_by)
  values (p_business_id, p_name, v_prefix, encode(extensions.digest(v_key, 'sha256'), 'hex'), p_scopes, (select auth.uid()))
  returning business_api_keys.id into v_id;

  return query select v_id, v_prefix, v_key;
end;
$$;

revoke execute on function public.create_business_api_key from anon;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.platform_settings enable row level security;
alter table public.audit_log enable row level security;
alter table public.business_api_keys enable row level security;

create policy "settings: public keys readable" on public.platform_settings
  for select to anon, authenticated
  using (is_public);
create policy "settings: admins manage" on public.platform_settings
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create policy "audit_log: owners read their business, admins all" on public.audit_log
  for select to authenticated
  using (
    (business_id is not null and (select private.is_business_owner(business_id)))
    or (select private.is_super_admin())
  );

-- Keys are created through the RPC; owners can view and revoke them.
create policy "api_keys: owners and admins read" on public.business_api_keys
  for select to authenticated
  using ((select private.is_business_owner(business_id)) or (select private.is_super_admin()));
create policy "api_keys: owners and admins revoke" on public.business_api_keys
  for update to authenticated
  using ((select private.is_business_owner(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_owner(business_id)) or (select private.is_super_admin()));
revoke update on public.business_api_keys from authenticated;
grant update (name, revoked_at) on public.business_api_keys to authenticated;
-- The hash never leaves the database through the API (select columns explicitly).
revoke select on public.business_api_keys from anon, authenticated;
grant select (id, business_id, name, key_prefix, scopes, created_by, last_used_at, expires_at, revoked_at, created_at)
  on public.business_api_keys to authenticated;
