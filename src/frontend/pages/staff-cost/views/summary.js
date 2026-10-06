import { esc, rub, signClass } from "../../../shared/ui/format.js";

export function renderSummaryView(root,{data}){
  const rows=Array.isArray(data?.items)?data.items:[];
  const latest=rows.at(-1);
  const flowAcc=rows.reduce((sum,row)=>sum+Number(row.accrual_total||0),0);
  const flowPay=rows.reduce((sum,row)=>sum+Number(row.payment_total||0),0);
  root.innerHTML='<div class="hero"><div><div class="hero-label">Общий баланс к выплате</div><div class="hero-value '+signClass(latest?.balance_to_pay)+'">'+rub(latest?.balance_to_pay)+'</div></div><div class="hero-side"><b>'+rows.length+'</b><span>месяцев</span></div></div>'
    +'<div class="submetrics"><div class="metric"><span>Начислено</span><b>'+rub(flowAcc)+'</b></div><div class="metric"><span>Выплачено</span><b>'+rub(flowPay)+'</b></div><div class="metric"><span>Исходящий</span><b>'+rub(latest?.closing_balance)+'</b></div></div>'
    +'<div class="section-title"><h2>По месяцам</h2><span>канонический summary</span></div>'
    +(rows.length?'<div class="list">'+rows.map((r)=>
      '<div class="summary-card item"><div class="summary-head"><div class="summary-month">'+String(r.reporting_month).padStart(2,"0")+'.'+r.reporting_year+'</div><div class="summary-balance '+signClass(r.balance_to_pay)+'">'+rub(r.balance_to_pay)+'</div></div><div class="summary-grid"><div class="summary-cell"><span>Начислено</span><b>'+rub(r.accrual_total)+'</b></div><div class="summary-cell"><span>Выплачено</span><b>'+rub(r.payment_total)+'</b></div><div class="summary-cell"><span>Входящий</span><b>'+rub(r.opening_balance)+'</b></div><div class="summary-cell"><span>Дельта месяца</span><b>'+rub(r.month_delta)+'</b></div></div></div>'
    ).join('')+'</div>':'<div class="native-empty">Нет данных</div>');
}
