# Moment Roadmap

Keep this file current: tick items as they land and update **Next up** so any session can pick up where the last one stopped.

## Next up
- Decide maps provider (Mapbox vs Google Maps) before Explore work
- Confirm exact "Third" orange hex from Figma (`packages/shared/src/tokens/colors.ts` has a placeholder)
- Phase 1 remaining: Supabase Auth providers (phone OTP via a Pakistan SMS provider, email, Apple, Google, Facebook). The client side is ready in `api.auth`; this is provider config in `supabase/config.toml` and the dashboard
- Phase 0 remaining: shared UI primitives, then the first screens (onboarding + auth) using `@moment/shared` schemas with react-hook-form
- Figma fields with no column yet (add a migration when the screens are built): profile pronouns and emergency contact, group "Who can see likes?", recommendation type (experience vs business; stored in the note for now)
- Search by distance and date (`near`, `maxDistanceKm`, `date`, `sort: 'distance'`) needs a search RPC; `catalog.searchListings` throws `unsupported` for these until then. Build it with the Explore map
- Align `minimum_password_length` in `supabase/config.toml` (6) with the client rule (8, letter + number)
- Confirm the passcode length with design (`PASSCODE_LENGTH = 6`; the Figma screen shows Face ID only)
- Check the date helpers on Hermes devices (they use `Intl.DateTimeFormat` with `timeZone`, verified on Node only)
- Choose payment providers for Pakistan (JazzCash, Easypaisa, Safepay, PayFast...) and the payout model (`direct` vs `platform_collect`); the schema supports both
- Business-side booking RPC for walk-ins and POS (`create_booking` is consumer-only today)
- Membership benefits in pricing (`create_booking` ignores member discounts and included sessions for now)

---

## Phase 0: Foundation ✅
- [x] pnpm monorepo (`apps/mobile`, `apps/web`, `packages/shared`, `supabase/`)
- [x] Expo app with Expo Router, Manrope loaded, placeholder screen
- [x] Next.js App Router app, Manrope via `next/font`, tokens as CSS variables
- [x] Design tokens in `@moment/shared` (colors, typography, spacing, radii, button sizes)
- [x] Supabase CLI config, empty migrations / functions / seed
- [x] `.env.example` files for both apps
- [ ] CI: typecheck + lint on push
- [ ] Shared UI primitives: Button (large/small, icon, states), Text, Input, Icon (Huge Icons)

## Phase 1: Data model, auth, roles
- [x] Core schema: 17 migrations covering every surface (see `docs/DATABASE.md`)
- [x] Roles: consumer, business owner / manager / staff, super admin
- [x] RLS on every table, business data scoped by `business_id`; explicit super admin policies
- [x] Booking engine: slot capacity, appointment availability, no double-booking, coupons, status RPCs
- [x] Provider-agnostic payments, refunds, payouts, wallet
- [x] pgTAP tests (117 assertions) for isolation, roles, bookings, social, payments
- [x] Generated TypeScript types in `@moment/shared` (`pnpm db:types`), typed clients in both apps
- [ ] Supabase Auth: phone OTP, email + password, Apple, Google, Facebook
- [x] Shared typed API client + zod schemas in `@moment/shared` (POS-ready: no client-specific logic in the API). See `packages/shared/README.md`
- [x] Shared helpers: PKR price formatting, +92 phone normalising and formatting, Asia/Karachi dates and times
- [x] Tests: 116 unit tests (vitest) and 23 integration tests running the API client against local Supabase (`pnpm test`, `pnpm test:integration`)
- [x] Seed data: Islamabad, Lahore, Karachi (PKR, Asia/Karachi, +92)

## Phase 2: Consumer app core (mobile)
- [ ] Onboarding, sign up / sign in, passcode + Face ID
- [ ] Location and notification permissions
- [ ] Home dashboard (Popular Activities, Top Hosts, Just For You)
- [ ] Search and filters
- [ ] Business detail, Experience detail, Host profile
- [ ] Bucket List, Recommend a place

## Phase 3: Booking and payments
- [ ] Booking flow: reservation, day, slot, guests, notes
- [ ] Stripe payments (test mode), coupons
- [ ] Bookings list and status
- [ ] Wallet

## Phase 4: Business portal (web)
- [ ] Business onboarding and profile
- [ ] Listings and services management
- [ ] Staff and availability
- [ ] Bookings management
- [ ] Memberships and reviews

## Phase 5: Super admin (web)
- [ ] Businesses, consumers, listings management
- [ ] Platform settings
- [ ] Moderation (reviews, listings)

## Phase 6: Social and discovery
- [ ] Chat (Supabase Realtime)
- [ ] Explore map
- [ ] Adventure Quiz + personality badge driving recommendations
- [ ] Groups: group travel, group match
- [ ] Profile: membership, offers, notifications, support, legal

## Phase 7: Consumer web and gamification
- [ ] Consumer web login and lightweight browsing/booking
- [ ] Gamification: personality badges, group progress

## Later: POS integration
- [ ] Convexa POS as another API client (auth, scoped keys per business)
