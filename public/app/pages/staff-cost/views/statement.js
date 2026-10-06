import { esc, recordCountLabel, rub, shortName } from "../../../shared/ui/format.js";

export function renderStatementView(root,{data,onEmployee,onLoadMore}){
  const summary=data?.summary||{};
  const flow=data?.flow||{};
  const items=Array.isArray(data?.items)?data.items:[];
  root.innerHTML=
    '<div class="balance-summary-grid"><div class="balance-summary-card"><div class="balance-summary-head"><span>Выплачено</span><span class="balance-summary-badge">'+Number(flow.payment_count||0)+'</span></div><div class="balance-summary-value">'+rub(flow.payment_total)+'</div></div>'
    +'<div class="balance-summary-card payable"><div class="balance-summary-head"><span>К выплате</span><span class="balance-summary-badge">'+Number(summary.payable_employee_count||0)+'</span></div><div class="balance-summary-value">'+rub(summary.payable_total)+'</div></div></div>'
    +'<div class="balance-register-sticky"><div class="balance-register-heading"><h2>Ведомость</h2><span class="balance-record-count">'+esc(recordCountLabel(data?.page?.total_count))+'</span></div></div>'
    +(items.length?'<div class="balance-register">'+items.map((r)=>
      '<button type="button" class="balance-register-grid balance-register-row" data-employee="'+r.staff_member_id+'"><span class="balance-person"><span class="balance-name">'+esc(shortName(r.fio_full))+'</span><span class="balance-accrual">'+rub(r.accrual_total)+'</span></span><span class="balance-paid">'+rub(r.payment_total)+'</span><span class="balance-end '+esc(r.settlement_state||"")+'">'+rub(r.closing_balance)+'</span><svg class="chev" viewBox="0 0 20 20" fill="none"><path d="m7.5 4.8 5.2 5.2-5.2 5.2" stroke="currentColor" stroke-width="1.7"/></svg></button>'
    ).join('')+'</div>':'<div class="native-empty">Нет данных ведомости</div>')
    +(data?.page?.next_offset!=null?'<div class="load-sentinel" data-load-more></div>':'');

  root.querySelectorAll("[data-employee]").forEach((button)=>button.onclick=()=>onEmployee(Number(button.dataset.employee)));
  if(data?.page?.next_offset!=null) onLoadMore?.(root.querySelector("[data-load-more]"),data.page.next_offset);
}

export function renderStatementEmployee(root,{data,onBack}){
  const periods=Array.isArray(data?.periods)?data.periods:[];
  const payments=Array.isArray(data?.payments)?data.payments:[];
  const latest=periods[0];
  root.innerHTML=
    '<div class="balance-detail-head"><button class="balance-back" type="button" data-back aria-label="Назад"><svg viewBox="0 0 24 24" fill="none"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2"/></svg></button><h1>'+esc(shortName(data?.fio_full))+'</h1></div>'
    +'<div class="balance-detail-grid"><div class="balance-summary-card"><div class="balance-summary-head">Начислено</div><div class="balance-summary-value">'+rub(data?.summary?.accrual_total)+'</div></div><div class="balance-summary-card"><div class="balance-summary-head">Выплачено</div><div class="balance-summary-value">'+rub(data?.summary?.payment_total)+'</div></div><div class="balance-summary-card payable"><div class="balance-summary-head">Остаток</div><div class="balance-summary-value">'+rub(latest?.closing_balance)+'</div></div></div>'
    +'<div class="balance-register-heading"><h2>Периоды</h2><span>'+periods.length+'</span></div>'
    +(periods.length?'<div class="balance-register">'+periods.map((r)=>
      '<div class="balance-period-row"><span class="period-main"><strong>'+String(r.reporting_month).padStart(2,"0")+'.'+r.reporting_year+'</strong><small>Начислено '+rub(r.accrual_total)+' · Выплачено '+rub(r.payment_total)+'</small></span><span class="balance-end '+esc(r.settlement_state||"")+'">'+rub(r.closing_balance)+'</span></div>'
    ).join('')+'</div>':'<div class="native-empty">Нет периодов</div>')
    +'<div class="balance-register-heading"><h2>Выплаты</h2><span>'+payments.length+'</span></div>'
    +(payments.length?'<div class="balance-register">'+payments.map((p)=>
      '<div class="balance-period-row"><span class="period-main"><strong>'+esc(p.payment_date)+'</strong><small>'+esc(p.payment_source_name||"")+'</small></span><span class="balance-end">'+rub(p.amount)+'</span></div>'
    ).join('')+'</div>':'<div class="native-empty">Нет выплат</div>');
  root.querySelector("[data-back]")?.addEventListener("click",onBack);
}
