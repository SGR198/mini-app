import { esc, formatDate, formatStamp, recordCountLabel, rub, shortName } from "../../../shared/ui/format.js";

export function renderPaymentsView(root,{data,filters,sources,onFilter,onPayment,onLoadMore}){
  const summary=data?.summary||{};
  const items=Array.isArray(data?.items)?data.items:[];
  const sourceButtons=(sources||[]).filter((s)=>s.is_active!==false).map((s)=>
    '<button class="native-action '+(filters.sourceCode===s.code?'active':'')+'" data-source="'+esc(s.code)+'">'+esc(s.name)+'</button>'
  ).join('');

  root.innerHTML=
    '<div class="payment-sticky"><div class="payment-heading"><h1>Выплаты</h1><div class="payment-snapshot"><span class="payment-snapshot-dot"></span>Данные на '+esc(formatStamp(data?.generated_at))+'</div></div>'
    +'<div class="payment-summary"><div><span>Выплачено</span><b>'+rub(summary.paid_total)+'</b></div><div><span>Черновики</span><b>'+rub(summary.draft_total)+'</b></div></div></div>'
    +'<div class="native-actions"><button class="native-action '+(!filters.status?'active':'')+'" data-status="">Все</button><button class="native-action '+(filters.status==='paid'?'active':'')+'" data-status="paid">Выплачено</button><button class="native-action '+(filters.status==='draft'?'active':'')+'" data-status="draft">Черновики</button></div>'
    +'<div class="native-filter-status">'+sourceButtons+'</div>'
    +'<div class="payment-register-heading"><h2>Реестр выплат</h2><span>'+esc(recordCountLabel(summary.total_count))+'</span></div>'
    +(items.length?'<div class="payment-register"><div class="payment-register-head general"><span>Сотрудник</span><span>Дата</span><span>Тип</span><span style="text-align:right">Сумма</span><span>Статус</span><span></span></div>'
      +items.map((p)=>'<button type="button" class="payment-register-row general '+(p.status==='draft'?'draft':'paid')+'" data-payment="'+p.id+'"><span class="pay-person">'+esc(shortName(p.fio_full))+'</span><span class="pay-date">'+esc(formatDate(p.payment_date))+'</span><span class="pay-type">'+esc(p.payment_source_name||p.payment_source_code)+'</span><span class="pay-amount">'+rub(p.amount)+'</span><span class="pay-status">'+(p.status==='paid'?'✓':'•')+'</span><svg class="pay-chev" viewBox="0 0 20 20" fill="none"><path d="m7.5 4.8 5.2 5.2-5.2 5.2" stroke="currentColor" stroke-width="1.7"/></svg></button>').join('')
      +'</div>':'<div class="payment-empty">Нет выплат для выбранных фильтров</div>')
    +(data?.page?.next_offset!=null?'<div class="load-sentinel" data-load-more></div>':'');

  root.querySelectorAll("[data-status]").forEach((button)=>{
    button.onclick=()=>onFilter({status:button.dataset.status||null});
  });
  root.querySelectorAll("[data-source]").forEach((button)=>{
    button.onclick=()=>onFilter({sourceCode:filters.sourceCode===button.dataset.source?null:button.dataset.source});
  });
  root.querySelectorAll("[data-payment]").forEach((button)=>{
    const item=items.find((p)=>Number(p.id)===Number(button.dataset.payment));
    button.onclick=()=>onPayment(item);
  });
  if(data?.page?.next_offset!=null) onLoadMore?.(root.querySelector("[data-load-more]"),data.page.next_offset);
}

export function renderPaymentDetail(root,{payment,onBack}){
  root.innerHTML='<div class="detail-head"><div><button class="native-back" type="button" data-back aria-label="Назад"><svg viewBox="0 0 24 24" fill="none"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2"/></svg></button><h1>'+esc(shortName(payment?.fio_full))+'</h1><p>Выплата #'+esc(payment?.id)+'</p></div><div class="detail-total">'+rub(payment?.amount)+'</div></div>'
    +'<div class="detail-grid"><div class="detail-box"><span>Дата выплаты</span><b>'+esc(formatDate(payment?.payment_date))+'</b></div><div class="detail-box"><span>Источник</span><b>'+esc(payment?.payment_source_name||"—")+'</b></div><div class="detail-box"><span>Статус</span><b>'+(payment?.status==='paid'?'Выплачено':'Черновик')+'</b></div><div class="detail-box"><span>Расчётный период</span><b>#'+esc(payment?.reporting_period_id)+'</b></div></div>'
    +(payment?.comment?'<div class="note">'+esc(payment.comment)+'</div>':'');
  root.querySelector("[data-back]")?.addEventListener("click",onBack);
}
