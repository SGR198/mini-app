# mini-app

Telegram Mini App для внутренних интерфейсов базы данных.

Текущий MVP показывает Staff Cost.

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

Frontend находится в `public/`.
Worker gateway находится в `src/index.js`.
Cloudflare configuration: `wrangler.jsonc`.

GitHub Pages больше не входит в deployment flow.

## API gateway

Browser вызывает только same-origin endpoint:

```text
POST /api/staff-cost
```

Worker передаёт JSON body в существующую Supabase Edge Function без изменения API contract.

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
