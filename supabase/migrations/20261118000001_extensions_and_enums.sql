-- Extensions, schemas, enums and shared utility functions.

create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;

-- Internal helpers (RLS checks, triggers, jobs). Not exposed through the API.
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.business_kind as enum ('host', 'operator', 'venue');
create type public.business_status as enum ('draft', 'pending_review', 'active', 'suspended');
create type public.business_role as enum ('owner', 'manager', 'staff');
create type public.member_status as enum ('invited', 'active');

create type public.category_kind as enum ('experience', 'service');
create type public.listing_type as enum ('experience', 'service');
create type public.listing_status as enum ('draft', 'published', 'archived');
create type public.booking_mode as enum ('slot', 'appointment');
create type public.price_unit as enum ('per_person', 'per_booking');
create type public.cancellation_policy as enum ('flexible', 'moderate', 'strict', 'non_refundable');

create type public.slot_status as enum ('open', 'full', 'cancelled');
create type public.exception_scope as enum ('business', 'listing', 'staff');

create type public.booking_status as enum (
  'pending', 'confirmed', 'completed', 'cancelled_by_consumer', 'cancelled_by_business', 'no_show'
);
create type public.booking_payment_status as enum (
  'unpaid', 'partially_paid', 'paid', 'partially_refunded', 'refunded'
);
create type public.booking_source as enum ('app', 'web', 'portal', 'pos');

create type public.payout_model as enum ('direct', 'platform_collect');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'cancelled');
create type public.refund_status as enum ('pending', 'succeeded', 'failed');
create type public.payout_status as enum ('pending', 'processing', 'paid', 'failed');
create type public.wallet_transaction_type as enum ('credit', 'debit', 'refund_credit', 'promo', 'adjustment');

create type public.review_status as enum ('published', 'hidden', 'flagged');
create type public.recommendation_status as enum ('new', 'reviewed', 'onboarded', 'rejected');

create type public.badge_kind as enum ('personality', 'achievement');
create type public.badge_source as enum ('quiz', 'achievement', 'admin');

create type public.group_visibility as enum ('private', 'public');
create type public.group_role as enum ('owner', 'admin', 'member');
create type public.group_member_status as enum ('invited', 'requested', 'active', 'left');

create type public.conversation_type as enum ('direct', 'business', 'group');

create type public.membership_interval as enum ('month', 'year', 'one_time');
create type public.membership_status as enum ('active', 'past_due', 'cancelled', 'expired');
create type public.discount_type as enum ('percent', 'fixed');

create type public.support_status as enum ('open', 'pending', 'resolved', 'closed');
create type public.legal_document_type as enum ('terms', 'privacy', 'cancellation', 'host_terms');
create type public.device_platform as enum ('ios', 'android', 'web');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
