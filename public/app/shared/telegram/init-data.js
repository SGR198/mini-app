export function getTelegramInitData() {
  const webApp=globalThis?.Telegram?.WebApp;
  if (!webApp) return "";
  webApp.ready?.();
  webApp.expand?.();
  return webApp.initData || "";
}
