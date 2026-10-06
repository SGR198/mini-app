import { esc, formatStamp, rub, shortName } from "../../../shared/ui/format.js";

export function renderAccrualsView(root,{data,onEmployee,onBodyRepair,onLoadMore}){
  const s=data?.summary||{};
  const items=Array.isArray(data?.items)?data.items:[];
  root.innerHTML=
    '<div class="summary-sticky"><div class="hero"><div><div class="hero-label">Начисление</div><div class="hero-value">'+rub(s.accrual_total)+'</div></div>'
    +'<div class="hero-side"><b>'+Number(s.employee_count||0)+'</b><span>сотрудников</span></div></div>'
    +'<div class="submetrics"><button type="button" class="metric metric-clickable" data-body-repair><span>🔨 Кузовной</span><b>'+rub(s.body_accrual_total)+'</b></button>'
    +'<div class="metric"><span>👤 Приёмщик</span><b>'+rub(s.service_advisor_accrual_total)+'</b></div>'
    +'<div class="metric"><span>🔧 Слесарный</span><b>'+rub(s.mechanical_accrual_total)+'</b></div></div></div>'
    +'<div class="section-title"><h2>Сотрудники</h2><span>'+Number(data?.page?.total_count||0)+' строк</span></div>'
    +(items.length?'<div class="list">'+items.map((item)=>
      '<button class="item" data-employee="'+item.staff_member_id+'"><div class="item-top"><div class="item-main"><div class="name">'+esc(shortName(item.fio_full))+'</div></div>'
      +'<div class="amount">'+rub(item.accrual_total)+'</div><svg class="chev" viewBox="0 0 20 20" fill="none"><path d="m7.5 4.8 5.2 5.2-5.2 5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></div></button>'
    ).join('')+'</div>':'<div class="native-empty">Нет начислений за выбранный период</div>')
    +(data?.page?.next_offset!=null?'<div class="load-sentinel" data-load-more></div>':'')
    +'<div class="native-meta">Данные на '+esc(formatStamp(data?.generated_at))+'</div>';

  root.querySelector("[data-body-repair]")?.addEventListener("click",onBodyRepair);
  root.querySelectorAll("[data-employee]").forEach((button)=>{
    button.onclick=()=>onEmployee(Number(button.dataset.employee));
  });
  if(data?.page?.next_offset!=null) onLoadMore?.(root.querySelector("[data-load-more]"),data.page.next_offset);
}
