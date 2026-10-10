/** Реестр экранов начислений: маршрутизация View отделена от общего renderer. */
export const accrualScreenCodes = Object.freeze({
  body_repair_accruals:"body_repair_accruals",
  mechanical_repair_accruals:"mechanical_repair_accruals",
  mechanical_service_advisor_accruals:"mechanical_service_advisor_accruals",
  body_service_advisor_accruals:"body_service_advisor_accruals",
  cleaner_compensation_accruals:"cleaner_compensation_accruals",
  manual_accrual_accruals:"manual_accrual_accruals",
  shift_compensation_accruals:"shift_compensation_accruals"
});
export function renderRegisteredAccrualScreen(view, screens){
  const renderer=screens[view];
  if(typeof renderer!=="function")return false;
  renderer();
  return true;
}

/** Shared Staff Cost accrual detail layout contract.
 * Every registered source screen uses the same bottom navigation/filter shell.
 * Adding a new source view to accrualScreenCodes automatically opts into that layout.
 */
export function isAccrualDetailScreen(view){
  return Object.hasOwn(accrualScreenCodes,view);
}
