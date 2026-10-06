import { countWord, esc, formatDate, rub, shortName } from "../../../shared/ui/format.js";

function employeeGroups(accruals){
  const map=new Map();
  for(const order of accruals||[]){
    for(const worker of order.workers||[]){
      const id=Number(worker.staff_member_id);
      const row=map.get(id)||{staff_member_id:id,fio_full:worker.fio_full,total:0,orders:[]};
      row.total+=Number(worker.accrual_amount||0);
      row.orders.push({...order,worker});
      map.set(id,row);
    }
  }
  return [...map.values()].sort((a,b)=>b.total-a.total||String(a.fio_full).localeCompare(String(b.fio_full),"ru"));
}

function renderAccruals(data){
  const groups=employeeGroups(data?.accruals||[]);
  return '<div class="body-register-heading"><h2>Кузовные начисления</h2><span>'+groups.length+' сотрудников</span></div>'
    +(groups.length?groups.map((group)=>
      '<section class="body-employee-group"><div class="body-employee-head"><span class="body-employee-main"><strong>'+esc(shortName(group.fio_full))+'</strong><small>'+group.orders.length+' '+countWord(group.orders.length,"заказ-наряд","заказ-наряда","заказ-нарядов")+'</small></span><span class="body-employee-total"><small>Всего начислено</small><strong>'+rub(group.total)+'</strong></span></div>'
      +'<div class="body-employee-orders">'+group.orders.map(({work_order_id,work_order_number,work_order_date,automobile_make,automobile_model,registration_plate,repair_final_amount,parts_final_amount,material_final_amount,worker})=>
        '<article class="body-wo-card"><div class="body-wo-top"><div class="body-wo-number">ЗН № '+esc(work_order_number||work_order_id)+'</div></div><div class="body-wo-meta">'+esc(formatDate(work_order_date))+' · '+esc([automobile_make,automobile_model].filter(Boolean).join(" "))+' · '+esc(registration_plate||"")+'</div><div class="body-money-chips"><span class="body-money-chip work">Раб: <b>'+rub(repair_final_amount)+'</b></span><span class="body-money-chip parts">ЗЧ: <b>'+rub(parts_final_amount)+'</b></span><span class="body-money-chip materials">Расх: <b>'+rub(material_final_amount)+'</b></span></div><div class="body-calc-grid"><div><span>База</span><b>'+rub(worker.calculation_base_amount)+'</b></div><div><span>КТУ</span><b>'+esc(worker.ktu??"—")+'</b></div><div class="accent"><span>Начислено</span><b>'+rub(worker.accrual_amount)+'</b></div></div></article>'
      ).join('')+'</div></section>'
    ).join(''):'<div class="native-empty">Нет кузовных начислений</div>');
}

function renderOrders(data){
  const rows=Array.isArray(data?.catalog)?data.catalog:[];
  return '<div class="body-register-heading"><h2>Заказ-наряды</h2><span>'+rows.length+'</span></div>'
    +(rows.length?'<div class="body-order-list">'+rows.map((w)=>
      '<article class="body-wo-card"><div class="body-wo-top"><div class="body-wo-number">ЗН № '+esc(w.work_order_number||w.work_order_id)+'</div><div class="body-money-chips"><span class="body-money-chip work">Раб: <b>'+rub(w.repair_final_amount)+'</b></span><span class="body-money-chip parts">ЗЧ: <b>'+rub(w.parts_final_amount)+'</b></span><span class="body-money-chip materials">Расх: <b>'+rub(w.material_final_amount)+'</b></span></div></div><div class="body-wo-meta">'+esc(formatDate(w.work_order_date))+' · '+esc([w.automobile_make,w.automobile_model].filter(Boolean).join(" "))+' · '+esc(w.customer_display_name_short||w.customer_display_name||"")+'</div><div class="body-wo-plate">'+esc(w.registration_plate||"Госномер не указан")+'</div><div class="native-meta">Оплата: '+esc(w.payment_summary?.payment_state||"unpaid")+' · '+rub(w.payment_summary?.paid_total)+'</div></article>'
    ).join('')+'</div>':'<div class="native-empty">Нет заказ-нарядов</div>');
}

function renderPayments(data){
  const rows=Array.isArray(data?.billing_payments)?data.billing_payments:[];
  const total=rows.reduce((sum,p)=>sum+Number(p.amount||0),0);
  return '<div class="client-payment-summary"><div><span>Получено за выбранный период</span><strong>'+rub(total)+'</strong></div><small>'+rows.length+' '+countWord(rows.length,"платёж","платежа","платежей")+'</small></div>'
    +(rows.length?'<div class="client-payment-list">'+rows.map((p)=>
      '<article class="client-payment-row"><div class="client-payment-main"><div class="client-payment-top"><span class="client-payment-date">'+esc(formatDate(p.payment_date))+'</span><span class="client-payment-method">'+esc(p.payment_method_name||p.payment_method_code||"")+'</span></div><div class="client-payment-order">'+esc(p.payer_display_name_short||p.payer_display_name||"Плательщик")+'</div><div class="client-payment-context">Распределено '+rub(p.allocated_total)+' · Остаток '+rub(p.unallocated_amount)+'</div></div><div class="client-payment-amount">'+rub(p.amount)+'</div></article>'
    ).join('')+'</div>':'<div class="native-empty">Нет клиентских оплат</div>');
}

export function renderBodyRepairView(root,{data,mode,onMode,onBack}){
  const total=(data?.accruals||[]).reduce((sum,row)=>sum+Number(row.accrual_total||0),0);
  root.innerHTML='<div class="body-repair-heading"><button type="button" class="body-repair-back" data-back aria-label="Назад"><svg viewBox="0 0 24 24" fill="none"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2"/></svg></button><div class="body-repair-heading-copy"><h1>Кузовной</h1></div></div>'
    +'<div class="body-summary-grid"><div class="body-summary-card"><span>Начислено</span><strong>'+rub(total)+'</strong></div><div class="body-summary-card"><span>Заказ-наряды</span><strong>'+Number(data?.catalog?.length||0)+'</strong></div></div>'
    +'<div class="native-body-tabs"><button class="native-action '+(mode==='accruals'?'active':'')+'" data-mode="accruals">Начисления</button><button class="native-action '+(mode==='orders'?'active':'')+'" data-mode="orders">Заказ-наряды</button><button class="native-action '+(mode==='payments'?'active':'')+'" data-mode="payments">Оплаты клиентов</button></div>'
    +(mode==='orders'?renderOrders(data):mode==='payments'?renderPayments(data):renderAccruals(data));

  root.querySelector("[data-back]")?.addEventListener("click",onBack);
  root.querySelectorAll("[data-mode]").forEach((button)=>button.onclick=()=>onMode(button.dataset.mode));
}
