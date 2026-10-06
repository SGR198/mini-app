# mini-app

Telegram Mini App monorepo for Loft Auto internal interfaces.

## Current production

The current production frontend still runs the legacy Staff Cost Dashboard №2 renderer.

```text
Telegram
  -> Cloudflare Worker database-miniapp
  -> Workers Static Assets: public/index.html
  -> POST /api/staff-cost
  -> Supabase Edge staff-cost-miniapp
  -> legacy dashboard payload/runtime
```

This path remains operational until the dedicated Staff Cost page cutover.

## Mini App v2 foundation

Issue #16 introduces a separate target runtime.

```text
Telegram Mini App
  -> Cloudflare Worker
  -> POST /api/miniapp
  -> Supabase Edge miniapp-api
  -> direct PostgreSQL transaction
  -> SET LOCAL ROLE miniapp_executor
  -> miniapp.*
  -> owning domain schemas
```

The browser never receives database credentials and never selects PostgreSQL schema/function/table identifiers.

Telegram `initData` is verified server-side in Supabase Edge.
The verified external subject resolves to the existing `access.identity` model in `SGR198/database`.

## Source structure

New frontend source is developed under:

```text
src/frontend/
├─ apps/
│  └─ owner/
├─ pages/
│  ├─ home/
│  └─ staff-cost/
└─ shared/
   ├─ api/
   └─ telegram/
```

Conceptual hierarchy:

```text
APP
  -> PAGE
      -> VIEW
          -> COMPONENT
```

A route belongs to an app-page binding.
Business calculations remain in Supabase domain schemas.

## Rendering

Renderer source belongs to this repository.

Target standalone rendering:

```text
GitHub source
  -> Cloudflare build
  -> private immutable R2 renderer artifact
  -> standalone page render
```

R2 is not the source of truth for frontend code, business data or permissions.

Document rendering remains a separate backend runtime.
Legacy Dashboard rendering remains separate until its eventual removal.

## API gateway

Two same-origin endpoints coexist during migration:

```text
POST /api/staff-cost
  -> legacy Staff Cost runtime

POST /api/miniapp
  -> new Mini App v2 runtime
```

Cloudflare only proxies HTTP.
Authentication, access and business data remain in Supabase.

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
