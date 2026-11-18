# Moment Roadmap

Keep this file current: tick items as they land and update **Next up** so any session can pick up where the last one stopped.

## Next up
- Decide maps provider (Mapbox vs Google Maps) before Explore work
- Confirm exact "Third" orange hex from Figma (`packages/shared/src/tokens/colors.ts` has a placeholder)
- Start Phase 1: core data model + auth

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
- [ ] Core schema: profiles, businesses, business_members, listings (experiences + services), staff, availability, bookings, reviews, memberships
- [ ] Roles: `consumer`, `business_owner`, `business_staff`, `super_admin`
- [ ] RLS on every business table scoped by `business_id`; explicit super admin policies
- [ ] Supabase Auth: phone OTP, email + password, Apple, Google, Facebook
- [ ] Shared typed API client + zod schemas in `@moment/shared` (POS-ready: no client-specific logic in the API)
- [ ] Seed data for local dev

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
