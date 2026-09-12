# mini-app

Публичный frontend для Telegram Mini App.

Первый MVP проверяет только один сценарий: Telegram `initData` отправляется в Supabase Edge Function, сервер валидирует подпись Telegram и разрешает доступ только пользователю `404880927`.

Frontend не содержит Telegram bot token, Supabase service role key или других серверных секретов.

GitHub Pages: `https://sgr198.github.io/mini-app/`
