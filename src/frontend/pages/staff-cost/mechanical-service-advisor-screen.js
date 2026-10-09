/** Mechanical service advisor source-only screen; reuses existing Staff Cost visual primitives. */
export function mechanicalAdvisorRows(employees,periodIds){
  const ids=new Set((periodIds||[]).map(Number));
  return (Array.isArray(employees)?employees:[]).map(employee=>{
    const periods=(employee.periods||[]).filter(p=>ids.has(Number(p.reporting_period_id))).map(p=>{
      const source=(p.sources||[]).find(s=>s.source_code==='mechanical_repair_service_advisor');
      return source?{...p,source,amount:Number(source.accrual_total)||0}:null;
    }).filter(Boolean);
    return periods.length?{staff_member_id:employee.staff_member_id,fio_full:employee.fio_full,periods,total:periods.reduce((s,p)=>s+p.amount,0)}:null;
  }).filter(Boolean).sort((a,b)=>b.total-a.total);
}
export function renderMechanicalServiceAdvisorAccruals(ctx){
  const {$,employees,periodIds,state,bodyRepairHeader,rub,esc,shortName,empty,filterSummary,openFilter,replace,bodyEmployeeIcon,bodyChevron,periodById,monthNames,cap}=ctx;
  const rows=mechanicalAdvisorRows(employees,periodIds);
  const total=rows.reduce((s,e)=>s+e.total,0);
  const collapsed=new Set((state.collapsed_body_employee_ids||[]).map(Number));
  const groups=rows.map(employee=>{
    const id=Number(employee.staff_member_id),expanded=!collapsed.has(id);
    const items=employee.periods.map(p=>{
      const ref=periodById.get(Number(p.reporting_period_id));
      const period=ref?cap(monthNames[ref.month-1])+' '+ref.year:'Период';
      return '<div class="body-wo-card"><div class="body-wo-top"><div class="body-wo-number">'+esc(period)+'</div></div><div class="body-calc-grid"><div><span>Оснований</span><b>'+Number(p.source.item_count||0)+'</b></div><div class="accent"><span>Начислено</span><b>'+rub(p.amount)+'</b></div></div></div>';
    }).join('');
    return '<section class="body-employee-group"><button type="button" class="body-employee-head" data-advisor-employee="'+id+'" aria-expanded="'+(expanded?'true':'false')+'"><span class="body-employee-avatar">'+bodyEmployeeIcon()+'</span><span class="body-employee-main"><strong>'+esc(shortName(employee.fio_full))+'</strong><small>'+employee.periods.length+' мес.</small></span><span class="body-employee-total"><small>Всего начислено</small><strong>'+rub(employee.total)+'</strong></span>'+bodyChevron(expanded)+'</button>'+(expanded?'<div class="body-employee-orders">'+items+'</div>':'')+'</section>';
  }).join('');
  $('content').innerHTML=bodyRepairHeader('Приёмщик слесарный')
    +'<div class="body-summary-grid"><div class="body-summary-card"><span>Начислено</span><strong>'+rub(total)+'</strong></div><div class="body-summary-card"><span>Сотрудники</span><strong>'+rows.length+'</strong></div></div>'
    +(groups||empty('Нет начислений приёмщика слесарного за выбранный период'))
    +filterSummary(false).replace('class="filter-summary"','class="filter-summary filter-dock"');
  document.querySelector('[data-body-back]')?.addEventListener('click',()=>history.back());
  document.querySelectorAll('[data-advisor-employee]').forEach(b=>b.onclick=()=>{
    const id=Number(b.dataset.advisorEmployee),next=new Set((state.collapsed_body_employee_ids||[]).map(Number));
    if(next.has(id))next.delete(id);else next.add(id);
    replace({...state,collapsed_body_employee_ids:[...next]});
  });
  document.querySelectorAll('.filter-dock [data-ftab]').forEach(b=>b.onclick=()=>openFilter(b.dataset.ftab));
}
