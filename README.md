# mini-app

Публичный frontend для Telegram Staff Cost Mini App.

GitHub Pages: `https://sgr198.github.io/mini-app/`

## Security boundary

Telegram `initData` отправляется в Supabase Edge Function `staff-cost-miniapp`. Сервер валидирует подпись Telegram и разрешает доступ только пользователю `404880927`.

Frontend не содержит Telegram bot token, Supabase service role key или других серверных секретов.

При прямом открытии страницы или невалидном доступе показывается только `Страница не найдена`.

## Этап 1

После успешной Telegram-аутентификации frontend вызывает action:

```text
monthly_balance_summary
```

Edge Function читает canonical VIEW `staff_cost.v_monthly_balance_summary`, применяет фильтры/сортировку/limit на стороне базы и возвращает готовый JSON.

Browser только форматирует и отображает таблицу:

```text
Период | Начислено | Выплачено | К выплате
```

Бизнес-агрегации и фильтрация полного набора данных в browser не выполняются.
