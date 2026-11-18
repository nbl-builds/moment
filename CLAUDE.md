# Moment

Moment is a booking platform for local experiences (tours, activities, local hosts) and local businesses (spas, salons, services). Tagline: "Discover Unforgettable Experiences. Live like a local, anywhere in the world."

## Surfaces
1. **Consumer mobile app** (iOS + Android): the main product for consumers.
2. **Consumer web**: lighter web login for consumers (secondary).
3. **Business portal** (web): businesses manage their listings, services, staff, availability, bookings, memberships and reviews.
4. **Super admin** (web): the Moment team controls all businesses, consumers, listings and platform settings.
5. **POS integration** (later): businesses will link a POS (built separately for Convexa) to manage things from mobile. Design the data model and API so the POS can become another client without a rebuild.

## Launch market
Pakistan first: Islamabad, Lahore, Karachi. Default currency PKR (stored in minor units), timezone Asia/Karachi, phone numbers +92.

## Stack
- Monorepo with pnpm workspaces
- `apps/mobile`: Expo (React Native), TypeScript, Expo Router
- `apps/web`: Next.js (App Router), TypeScript. Hosts consumer web, business portal and super admin, separated by role and route groups
- `packages/shared`: shared types, validation schemas, API client, design tokens
- `supabase/`: Postgres schema, migrations, Row Level Security policies, edge functions, seed data
- Auth: Supabase Auth (phone OTP, email + password, Apple, Google, Facebook)
- Payments: provider-agnostic (launch market is Pakistan, where Stripe is unavailable). Store provider name plus provider transaction/account refs; payout model (direct vs Moment collects) is undecided. See `docs/DATABASE.md`
- Maps: Mapbox or Google Maps (decide before building Explore)
- Realtime chat: Supabase Realtime

## Roles and access
- `consumer`, business `owner` / `manager` / `staff` (per business, in `business_members`), `super_admin`
- Managers edit listings, prices and schedules, but not payouts, business settings or team membership
- Every table holding business data is scoped by `business_id` and protected with RLS. A business only ever sees its own data. Super admin access goes through explicit policies, never by disabling RLS.

## Design system (from Figma)
Figma file: https://www.figma.com/design/YO49DEbUlD2NhVAKYFQ5vi/Moment-Costumer-App
- Primary #CFFF58 (lime), Secondary #131617 (near black), Third orange, Base black #1A1A1A, white #FFFFFF
- Font: Manrope only. H4 Bold 20 / 1.2. Body 16 / 14 / 12 / 10, line height 1.5
- Buttons: large and small, with or without icon; states default, pressed, dark, loading, disabled, outline, ghost; icon-only square
- Icons: Huge Icons (stroke / solid / duotone)
- Mobile frames are 428 x 926
- Define tokens once in `packages/shared` and use them in both apps. No hardcoded colors or font sizes.

## Consumer app features (from Figma)
Onboarding, sign up / sign in (phone OTP, email, social), passcode and Face ID, location and notification permissions, Home dashboard (Popular Activities, Top Hosts, Just For You), Adventure Quiz with personality badge driving recommendations, Search and filters, Bucket List, Recommend a place, Business detail, Experience detail and host profile, Booking flow (reservation, day, slot, guests, notes, payment, coupons), Bookings list and status, Chat, Explore map, Groups (group travel, group match), Profile (wallet, membership, offers, notifications, support, legal).
Planned: gamification (personality badges, group progress).

## Conventions
- TypeScript strict mode everywhere
- Database changes only through migrations in `supabase/migrations`
- Never commit secrets. Use `.env.local` files and keep `.env.example` up to date
- Small, focused commits with clear messages
- Keep `docs/ROADMAP.md` updated: mark features done and note what's next, so any session can pick up where the last stopped

## Dev workflow
- Mobile: `pnpm --filter mobile start`, then scan the QR code with Expo Go (Android phone) or use the iOS Simulator
- Web: `pnpm --filter web dev`
- Supabase: local development with the Supabase CLI