/** Реестр карточек источников начислений. Добавление нового источника не требует менять HTML главного экрана. */
export const accrualCards = Object.freeze([
  {code:"body_repair",label:"Кузовной",icon:"🔨",view:"body_repair_accruals",amountKey:"body",selector:"data-body-repair"},
  {code:"mechanical_service_advisor",sourceCode:"mechanical_repair_service_advisor",label:"Приёмщик слесарный",icon:"👤",view:"mechanical_service_advisor_accruals",amountKey:"advisor",selector:"data-mechanical-service-advisor"},
  {code:"mechanical_repair",label:"Слесарный",icon:"🔧",view:"mechanical_repair_accruals",amountKey:"mech",selector:"data-mechanical-repair"}
]);
export function renderAccrualCards(amounts,formatAmount){
  return '<div class="submetrics">'+accrualCards.map(card=>{
    const inner='<span>'+card.icon+' '+card.label+'</span><b>'+formatAmount(amounts[card.amountKey])+'</b>';
    return card.selector?'<button type="button" class="metric metric-clickable" '+card.selector+'>'+inner+'</button>':'<div class="metric">'+inner+'</div>';
  }).join('')+'</div>';
}
