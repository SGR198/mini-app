export function getTelegramInitData() {
  return globalThis?.Telegram?.WebApp?.initData || "";
}
