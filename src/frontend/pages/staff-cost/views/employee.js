import { esc, formatDate, rub, shortName } from "../../../shared/ui/format.js";

function itemMeta(item){
  return [
    item.work_order_number?("ЗН № "+item.work_order_number):null,
    item.work_order_date?formatDate(item.work_order_date):null,
    [item.automobile_make,item.automobile_model].filter(Boolean).join(" ")||null,
    item.registration_plate||null
  ].filter(Boolean).join(" · ");
}

export function renderEmployeeView(root,{data,onBack}){
  const periods=Array.isArray(data?.periods)?data.periods:[];
  root.innerHTML=
    '<div class="detail-head"><div><button class="native-back" type="button" data-back aria-label="Назад"><svg viewBox="0 0 24 24" fill="none"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
    +'<h1>'+esc(shortName(data?.fio_full))+'</h1><p>Детализация начислений</p></div><div class="detail-total">'+rub(data?.summary?.accrual_total)+'</div></div>'
    +(periods.length?periods.map((period)=>
      '<section class="native-source"><div class="native-source-head"><div><strong>'+Number(period.reporting_month).toString().padStart(2,"0")+'.'+period.reporting_year+'</strong><div class="native-meta">Итого за период</div></div><b>'+rub(period.accrual_total)+'</b></div>'
      +(Array.isArray(period.sources)&&period.sources.length?period.sources.map((source)=>
        '<div class="native-source-items"><div class="native-source-head"><div><strong>'+esc(source.source_name||source.source_code)+'</strong><div class="native-meta">'+Number(source.item_count||0)+' записей</div></div><b>'+rub(source.accrual_total)+'</b></div>'
        +(Array.isArray(source.items)?source.items.map((item)=>
          '<div class="native-source-item"><div><strong>'+esc(item.customer_display_name_short||item.customer_display_name||item.source_item_type||"Начисление")+'</strong><b style="float:right">'+rub(item.accrual_amount)+'</b></div>'
          +'<div class="native-source-item-meta">'+esc(itemMeta(item))+'</div>'
          +(item.calculation_base_amount!=null?'<div class="native-source-item-meta">База '+rub(item.calculation_base_amount)+(item.ktu!=null?' · КТУ '+esc(item.ktu):'')+'</div>':'')
          +(Array.isArray(item.repair_positions)&&item.repair_positions.length?'<div class="native-source-item-meta">'+item.repair_positions.map((p)=>esc(p.repair_name)+' — '+rub(p.final_amount)).join('<br>')+'</div>':'')
          +'</div>'
        ).join(''):'')
        +'</div>'
      ).join(''):'<div class="native-empty">Нет источников</div>')
      +'</section>'
    ).join(''):'<div class="native-empty">Нет начислений сотрудника за выбранный период</div>');

  root.querySelector("[data-back]")?.addEventListener("click",onBack);
}
