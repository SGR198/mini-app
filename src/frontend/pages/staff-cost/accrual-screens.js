/** Реестр экранов начислений: маршрутизация View отделена от общего renderer. */
export const accrualScreenCodes = Object.freeze({
  body_repair_accruals:"body_repair_accruals",
  mechanical_repair_accruals:"mechanical_repair_accruals"
});
export function renderRegisteredAccrualScreen(view, screens){
  const renderer=screens[view];
  if(typeof renderer!=="function")return false;
  renderer();
  return true;
}
