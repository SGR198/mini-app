# mini-app

Telegram Mini App для внутренних интерфейсов базы данных.

Текущий MVP показывает Staff Cost.

## Runtime

Production frontend:

```text
GitHub private source
  -> Cloudflare Workers Builds
  -> Worker: database-miniapp
  -> Workers Static Assets
```

Frontend находится в `public/`.

Cloudflare configuration: `wrangler.jsonc`.

До завершения migration issue #4 старый GitHub Pages deployment сохраняется как rollback.

## Backend

На первом этапе backend не меняется.

```text
Telegram Mini App
  -> Supabase Edge Function staff-cost-miniapp
  -> runtime_api
  -> staff_cost
```

Telegram `initData` отправляется в Supabase Edge Function `staff-cost-miniapp`.
Сервер валидирует Telegram signature и разрешённого пользователя.

Frontend не содержит Telegram bot token, Supabase service role key или других server-side secrets.

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
