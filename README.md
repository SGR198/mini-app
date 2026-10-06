# mini-app

Telegram Mini App monorepo for Loft Auto internal interfaces.

## Production runtime

Staff Cost is the first native Mini App v2 page.

```text
Telegram Mini App
  -> Cloudflare Worker database-miniapp
  -> Workers Static Assets
  -> POST /api/miniapp
  -> Supabase Edge miniapp-api
  -> direct PostgreSQL transaction
  -> miniapp.staff_cost_*
  -> staff_cost / related domain facts
```

The frontend no longer reads `dashboard.payload_staff_cost`.
Business calculations remain in Supabase domain schemas.

## Staff Cost source

```text
src/frontend/
├─ apps/owner/
├─ pages/staff-cost/
│  ├─ page.js
│  ├─ api.js
│  ├─ views/
│  └─ components/
├─ shared/
└─ styles/
```

The production `public/` directory is generated from `src/frontend/` by:

```text
npm run build:frontend
```

Cloudflare build/deploy runs the frontend build before Wrangler.

## Data loading

Staff Cost uses view/use-case API contracts.

```text
bootstrap              -> metadata only
accruals               -> paginated
employee detail        -> on demand
payments               -> paginated
statement              -> paginated
statement employee     -> on demand
summary                -> selected periods
body repair drilldown  -> on demand
```

List continuation uses IntersectionObserver prefetch near the end of the current list.

## Access

Telegram `initData` is verified by Supabase Edge.

```text
initData
  -> verified Telegram subject
  -> miniapp.identity_subject
  -> access.identity
  -> trusted Mini App context
```

Cloudflare does not own authorization or business logic.

## Rendering

Frontend/renderer source belongs to this repository.

Future standalone rendering remains compatible with ADR-0028:

```text
source
  -> Cloudflare build
  -> private R2 renderer artifact
  -> standalone render
  -> optional delivery
```

R2 is not an authorization boundary.

Document rendering remains separate.
Legacy Dashboard rendering remains separate until its cleanup issue removes the old Staff Cost consumer.

## Legacy compatibility

During cutover the Worker still exposes `/api/staff-cost` and the old Supabase `staff-cost-miniapp` Edge Function remains deployed.

The native page uses only `/api/miniapp`.

The old route/runtime is removed only in the follow-up cleanup issue after production verification.

## Repository workflow

```text
feature/*
  -> PR -> dev
  -> integration verification
  -> PR dev -> main
  -> Cloudflare production deploy
```

See `AGENTS.md`.

Canonical backend contract and ADR live in `SGR198/database`.
