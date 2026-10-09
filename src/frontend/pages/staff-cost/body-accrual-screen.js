export function renderBodyRepairAccruals(ctx){
  const {mechanicalAccrualModel,state,periodById,monthNames,cap,esc,mechanicalHours,rub,bodyEmployeeIcon,shortName,recordCountLabel,bodyChevron,bodyRepairHeader,num,empty,filterSummary,openFilter,replace,data,bodyRepairEmployeeGroups,currentAccrualAggregate,bodyRepairVisibleWorkOrderCount,workOrderCountLabel,bodyRepairWorkOrderCard,bodyWorkOrderChevron,openBodyRepairWorkOrders}=ctx;
  const $=ctx.$;

  if(Number(data.version)<9){$('content').innerHTML=empty('Для кузовных начислений требуется payload v9');return}
  const groups=bodyRepairEmployeeGroups();
  const scope=currentAccrualAggregate();
  const uniqueCount=Number(data.version)>=10?bodyRepairVisibleWorkOrderCount():new Set(groups.flatMap(g=>g.items).map(i=>Number(i.work_order_id)).filter(Number.isFinite)).size;
  const collapsed=new Set((state.collapsed_body_employee_ids||[]).map(Number));
  const groupHtml=groups.map(group=>{
    const employeeId=Number(group.staff_member_id),expanded=!collapsed.has(employeeId);
    return `<section class="body-employee-group"><button type="button" class="body-employee-head" data-body-employee="${employeeId}" aria-expanded="${expanded?'true':'false'}"><span class="body-employee-avatar">${bodyEmployeeIcon()}</span><span class="body-employee-main"><strong>${esc(shortName(group.fio_full))}</strong><small>${esc(workOrderCountLabel(group.work_order_count))}</small></span><span class="body-employee-total"><small>Всего начислено</small><strong>${rub(group.accrual_total)}</strong></span>${bodyChevron(expanded)}</button>${expanded?`<div class="body-employee-orders">${group.items.map(bodyRepairWorkOrderCard).join('')}</div>`:''}</section>`;
  }).join('');
  $('content').innerHTML=bodyRepairHeader('Кузовные начисления')+
    `<div class="body-summary-grid"><div class="body-summary-card"><span>Начислено по кузовному</span><strong>${rub(scope.body_accrual_total)}</strong></div><button type="button" class="body-summary-card link" data-body-work-orders><span>Заказ-наряды</span><strong>${uniqueCount}</strong>${bodyWorkOrderChevron()}</button></div>`+
    (groupHtml||empty('Нет кузовных начислений за выбранный период'))+
    filterSummary(false).replace('class="filter-summary"','class="filter-summary filter-dock"');
  document.querySelector('[data-body-back]')?.addEventListener('click',()=>history.back());
  document.querySelector('[data-body-work-orders]')?.addEventListener('click',openBodyRepairWorkOrders);
  document.querySelectorAll('[data-body-employee]').forEach(b=>b.onclick=()=>{
    const id=Number(b.dataset.bodyEmployee),next=new Set((state.collapsed_body_employee_ids||[]).map(Number));
    if(next.has(id))next.delete(id);else next.add(id);
    replace({...state,collapsed_body_employee_ids:[...next]});
  });
  document.querySelectorAll('.filter-dock [data-ftab]').forEach(b=>b.onclick=()=>openFilter(b.dataset.ftab));
}
