export function renderMechanicalRepairAccruals(ctx){
  const {mechanicalAccrualModel,state,periodById,monthNames,cap,esc,mechanicalHours,rub,bodyEmployeeIcon,shortName,recordCountLabel,bodyChevron,bodyRepairHeader,num,empty,filterSummary,openFilter,replace,data,bodyRepairEmployeeGroups,currentAccrualAggregate,bodyRepairVisibleWorkOrderCount,workOrderCountLabel,bodyRepairWorkOrderCard,bodyWorkOrderChevron,openBodyRepairWorkOrders}=ctx;
  const $=ctx.$;

  const employees=Array.isArray(mechanicalAccrualModel?.employees)?mechanicalAccrualModel.employees:[];
  const collapsed=new Set((state.collapsed_body_employee_ids||[]).map(Number));
  const groups=employees.map(employee=>{
    const id=Number(employee.staff_member_id),expanded=!collapsed.has(id);
    const items=Array.isArray(employee.items)?employee.items:[];
    const rows=items.map(item=>{
      const p=periodById.get(Number(item.reporting_period_id));
      const period=p?cap(monthNames[p.month-1])+' '+p.year:'Период';
      return '<div class="body-wo-card"><div class="body-wo-top"><div class="body-wo-number">'+esc(period)+'</div></div><div class="body-calc-grid"><div><span>Часы</span><b>'+esc(mechanicalHours(item.labor_hours))+'</b></div><div><span>Ставка</span><b>'+rub(item.hourly_rate)+'/ч</b></div><div class="accent"><span>Начислено</span><b>'+rub(item.accrual_amount)+'</b></div></div><div class="body-wo-meta">'+esc(mechanicalHours(item.labor_hours))+' × '+esc(rub(item.hourly_rate))+'/ч = '+esc(rub(item.accrual_amount))+'</div></div>';
    }).join('');
    return '<section class="body-employee-group"><button type="button" class="body-employee-head" data-mechanical-employee="'+id+'" aria-expanded="'+(expanded?'true':'false')+'"><span class="body-employee-avatar">'+bodyEmployeeIcon()+'</span><span class="body-employee-main"><strong>'+esc(shortName(employee.fio_full))+'</strong><small>'+esc(recordCountLabel(items.length))+'</small></span><span class="body-employee-total"><small>Всего начислено</small><strong>'+rub(employee.accrual_total)+'</strong></span>'+bodyChevron(expanded)+'</button>'+(expanded?'<div class="body-employee-orders">'+rows+'</div>':'')+'</section>';
  }).join('');
  $('content').innerHTML=bodyRepairHeader('Слесарные начисления')
    +'<div class="body-summary-grid"><div class="body-summary-card"><span>Начислено по слесарному</span><strong>'+rub(mechanicalAccrualModel?.summary?.accrual_total)+'</strong></div><div class="body-summary-card"><span>Сотрудники</span><strong>'+num(mechanicalAccrualModel?.summary?.employee_count)+'</strong></div></div>'
    +(groups||empty('Нет слесарных начислений за выбранный период'))
    +filterSummary(false).replace('class="filter-summary"','class="filter-summary filter-dock"');
  document.querySelector('[data-body-back]')?.addEventListener('click',()=>history.back());
  document.querySelectorAll('[data-mechanical-employee]').forEach(b=>b.onclick=()=>{
    const id=Number(b.dataset.mechanicalEmployee),next=new Set((state.collapsed_body_employee_ids||[]).map(Number));
    if(next.has(id))next.delete(id);else next.add(id);
    replace({...state,collapsed_body_employee_ids:[...next]});
  });
  document.querySelectorAll('.filter-dock [data-ftab]').forEach(b=>b.onclick=()=>openFilter(b.dataset.ftab));
}
