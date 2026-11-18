# Moment

Booking platform for local experiences and local businesses. See `CLAUDE.md` for product and architecture notes, and `docs/ROADMAP.md` for progress.

## Layout
```
apps/mobile      Expo (React Native) consumer app, Expo Router
apps/web         Next.js: consumer web, business portal, super admin
packages/shared  Design tokens (later: types, schemas, API client)
supabase/        Config, migrations, edge functions, seed
```

## Getting started
```bash
pnpm install
cp apps/mobile/.env.example apps/mobile/.env.local
cp apps/web/.env.example apps/web/.env.local

pnpm mobile          # Expo dev server, scan QR with Expo Go or press i for iOS Simulator
pnpm web             # http://localhost:3000
pnpm typecheck       # all packages
```

Supabase (needs Docker): `pnpm exec supabase start`, then copy the printed URL and anon key into the `.env.local` files.
