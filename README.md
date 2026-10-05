# mini-app

Telegram Mini App для внутренних интерфейсов базы данных.

Текущий production frontend показывает canonical Staff Cost Dashboard №2 (`staff_cost_accruals_v2`).

## Runtime

Production runtime:

```text
GitHub source
  -> Cloudflare Workers Builds
  -> Worker: database-miniapp
       ├── Workers Static Assets
       └── /api/staff-cost
              -> Supabase Edge Function staff-cost-miniapp
              -> runtime_api
              -> staff_cost
```

Canonical live renderer находится в `public/index.html`.
Он синхронизирован с production Dashboard №2 renderer из `dashboard.registry.html_template`.
Worker gateway находится в `src/index.js`.
Cloudflare configuration: `wrangler.jsonc`.

GitHub Pages больше не входит в deployment flow.

## API gateway

Browser вызывает только same-origin endpoint:

```text
POST /api/staff-cost
  action = dashboard_payload
```

Worker передаёт JSON body в существующую Supabase Edge Function. Edge Function после Telegram authentication возвращает canonical `dashboard.payload_staff_cost`.

Worker не валидирует Telegram `initData`.
Telegram signature и allowlist пользователя проверяет `staff-cost-miniapp`.

Frontend не содержит прямой URL Supabase Edge Function, Telegram bot token, Supabase service role key или другие server-side secrets.

На этом этапе Worker не использует KV, R2 или D1 и не кэширует ответы Staff Cost.

## Repository workflow

```text
feature/*
  -> PR -> dev
  -> integration verification
  -> PR dev -> main
  -> Cloudflare production deploy
```

`main` — production source of truth.
Cloudflare production deploy запускается только из `main`.

См. `AGENTS.md`.


## Dashboard №2 renderer

Production `public/index.html` — self-contained Dashboard №2 renderer.

Он поддерживает два data-source режима:

```text
embedded snapshot -> {{DASHBOARD_DATA_JSON}}
live Mini App     -> /api/staff-cost -> dashboard_payload
```

В рамках migration issue #12 UI, фильтры и бизнес-семантика не меняются.
