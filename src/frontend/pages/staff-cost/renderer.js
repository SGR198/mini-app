import { mechanicalAdvisorRows, renderMechanicalServiceAdvisorAccruals } from "./mechanical-service-advisor-screen.js";
import { renderMechanicalRepairAccruals } from "./mechanical-accrual-screen.js";
import { renderBodyRepairAccruals } from "./body-accrual-screen.js";
import { renderRegisteredAccrualScreen } from "./accrual-screens.js";
import { renderAccrualCards } from "./accrual-cards.js";
import { staffCostApi } from "./api.js";

export async function mountStaffCostDashboard2(){
'use strict';
let initialPayload;
try{initialPayload=await staffCostApi.initial()}
catch(error){
  console.error('staff_cost_dashboard_load_failed',error);
  document.body.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui,sans-serif">Страница не найдена</main>';
  return;
}

const data={
  version:Number(initialPayload?.payload_version)||13,
  meta:{generated_at:initialPayload?.generated_at||null},
  config:initialPayload?.config||{},
  entities:initialPayload?.entities||{}
};
const periods=Array.isArray(data.entities.periods)?data.entities.periods:[];
const staff=Array.isArray(data.entities.staff_members)?data.entities.staff_members:[];
const sources=Array.isArray(data.entities.payment_sources)?data.entities.payment_sources:[];

let accrualModel=initialPayload?.accruals||null;
let accrualModelKey=Array.isArray(initialPayload?.scope?.period_ids)
  ? initialPayload.scope.period_ids.map(Number).sort((a,b)=>a-b).join(',')
  : '';
let paymentModel=null;
let paymentModelKey='';
let statementModel=null;
let statementModelKey='';
let statementEmployeeModel=null;
let statementEmployeeModelKey='';
let statementMonthModel=null;
let statementMonthModelKey='';
let summaryModel=null;
let summaryModelKey='';
let bodyAccrualModel=null;
let bodyAccrualModelKey='';
let mechanicalAccrualModel=null;
let mechanicalAccrualModelKey='';
let bodyCatalogModel=null;
let bodyCatalogModelKey='';
let billingModel=null;
let billingModelKey='';

let accrualEmployees=[];
let payments=[];
let balances=[];
let summaries=[];
let bodyRepairWorkOrders=[];
let bodyRepairWorkOrderCatalog=[];
let billingPayments=[];

const employeeModels=new Map();
const sourceModels=new Map();
const repairModels=new Map();
const sectionLabels={accruals:'Начисления',payments:'Выплаты',balance:'Ведомость',summary:'Общий баланс'};
const monthNames=['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const monthShort=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const years=(Array.isArray(data?.config?.year_options)&&data.config.year_options.length?data.config.year_options:[2026,2027,2028]).map(Number);
const rub=v=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2}).format(Number(v)||0).replace(',00','');
const rubNumber=v=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(v)||0);
const num=v=>Number(v)||0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const cap=v=>v?String(v).charAt(0).toUpperCase()+String(v).slice(1):'';
const shortName=v=>{const p=String(v||'').trim().split(/\s+/).filter(Boolean);if(p.length<=1)return p[0]||'Сотрудник';return `${p[0]} ${p.slice(1,3).map(x=>(x[0]||'')+'.').join('')}`};
const recordCountLabel=v=>{const n=Math.abs(Math.trunc(num(v))),n100=n%100,n10=n%10;const word=n100>=11&&n100<=14?'записей':n10===1?'запись':n10>=2&&n10<=4?'записи':'записей';return `${n} ${word}`};
const countWord=(v,one,few,many)=>{const n=Math.abs(Math.trunc(num(v))),n100=n%100,n10=n%10;return n100>=11&&n100<=14?many:n10===1?one:n10>=2&&n10<=4?few:many};
const paymentPaidCountLabel=v=>num(v)+' '+countWord(v,'оплата','оплаты','оплат');
const draftRecordCountLabel=v=>recordCountLabel(v);
const staffById=new Map(staff.map(x=>[Number(x.id),x]));
const sourceById=new Map(sources.map(x=>[Number(x.id),x]));
const periodById=new Map(periods.map(x=>[Number(x.id),x]));
const accrualEmployeeById=new Map();
const latest=periods.slice().sort((a,b)=>(a.year-b.year)||(a.month-b.month)).at(-1);
const initialPeriod=periodById.get(Number(initialPayload?.config?.default_period_id))||latest;
const baseYear=years.includes(Number(initialPeriod?.year))?Number(initialPeriod?.year):years[0];
const baseMonth=Number(initialPeriod?.month)||1;
const baseQuarter=Math.floor((baseMonth-1)/3)+1;
const accrualMonthKey=baseYear*12+baseMonth-1;
const initial={section:'accruals',year:baseYear,quarter:baseQuarter,selected_period_ids:null,rangeStart:accrualMonthKey,rangeEnd:accrualMonthKey,view:'list',employee_id:null,employeeAllPeriods:false,collapsed_period_ids:[],collapsed_body_employee_ids:[],reporting_period_id:null,source_code:null,source_item_id:null,payment_id:null,payment_status_filter:null,payment_type_filter:null,depth:0};
let state=history.state?.staffCost?{...initial,...history.state}:initial;
const $=id=>document.getElementById(id);
let filterOpen=false,filterTab='quarter',focusYear=baseYear,focusQuarter=Math.floor((accrualMonthKey%12)/3)+1;
const monthKey=(y,m)=>Number(y)*12+Number(m)-1;
const yearOf=k=>Math.floor(k/12);
const monthOf=k=>k%12+1;
function accrualIds(){return periods.filter(p=>monthKey(p.year,p.month)>=state.rangeStart&&monthKey(p.year,p.month)<=state.rangeEnd).map(p=>Number(p.id))}
function allAccrualIds(){return periods.map(p=>Number(p.id))}
function additiveSum(rows,field){return rows.reduce((s,r)=>s+num(r?.[field]),0)}
function scopeKey(ids){return [...new Set((ids||[]).map(Number))].sort((a,b)=>a-b).join(',')}
function touchGenerated(payload){if(payload?.generated_at)data.meta.generated_at=payload.generated_at}
function currentAccrualAggregate(){
  const summary=accrualModel?.summary||{};
  return {...summary,employees:Array.isArray(accrualModel?.items)?accrualModel.items:[]};
}
function employeeAccrualTotal(employeeId,ids){
  const employee=accrualEmployeeById.get(Number(employeeId));
  const idSet=new Set((ids||[]).map(Number));
  return (Array.isArray(employee?.periods)?employee.periods:[])
    .filter(r=>idSet.has(Number(r.reporting_period_id)))
    .reduce((sum,r)=>sum+num(r.accrual_total),0);
}
function paymentRowsBase(employeeId=null){
  return payments
    .filter(p=>employeeId==null||Number(p.staff_member_id)===Number(employeeId))
    .slice()
    .sort((a,b)=>String(b.payment_date).localeCompare(String(a.payment_date))||Number(b.id)-Number(a.id));
}
function paymentRowsFiltered(employeeId=null){return paymentRowsBase(employeeId)}
function paymentSummary(){return paymentModel?.summary||{
  total_count:payments.length,
  total_amount:additiveSum(payments,'amount'),
  paid_count:payments.filter(p=>p.status==='paid').length,
  paid_total:additiveSum(payments.filter(p=>p.status==='paid'),'amount'),
  draft_count:payments.filter(p=>p.status==='draft').length,
  draft_total:additiveSum(payments.filter(p=>p.status==='draft'),'amount')
}}
function paymentSourceLabel(code,name){if(code==='cash')return 'Нал';if(code==='bank')return 'Безнал';return name||code||''}
function paymentTypeOptions(){
  return sources.map(s=>({code:s.code,label:paymentSourceLabel(s.code,s.name)}));
}
function paymentIcon(kind,code=''){
  if(kind==='draft')return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3h7l4 4v14H7z" stroke="currentColor" stroke-width="1.8"/><path d="M14 3v5h5M10 13h5M10 17h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  if(kind==='paid')return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor"/><path d="m7.8 12.2 2.6 2.7 5.8-6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if(code==='cash')return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.3" stroke="currentColor" stroke-width="1.6"/><path d="M6 9c1.3 0 2-1 2-2M18 15c-1.3 0-2 1-2 2" stroke="currentColor" stroke-width="1.4"/></svg>';
  if(code==='bank')return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 9 8-5 8 5M5 10h14M6 10v7M10 10v7M14 10v7M18 10v7M4 19h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if(code==='telecom')return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M10 6h4M11 18h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  if(code==='cash_desk')return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8h14l2 12H3L5 8Z" stroke="currentColor" stroke-width="1.8"/><path d="M8 8V4h8v4M8 12h8M8 16h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M9 12h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
}
function paymentTypeIcon(p){if(p.status==='draft')return paymentIcon('draft');const src=sourceById.get(Number(p.payment_source_id));return paymentIcon('source',src?.code||'')}
function paymentStatusIcon(status){return status==='paid'?paymentIcon('paid'):paymentIcon('draft')}
function paymentDateText(v){return new Date(String(v)+'T00:00:00').toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit'})}
function paymentStamp(){const g=data?.meta?.generated_at?new Date(data.meta.generated_at):null;return g&&!Number.isNaN(g.valueOf())?g.toLocaleString('ru-RU',{timeZone:'Asia/Yekaterinburg',day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',','')+' ЕКБ':''}
function paymentAggregateChip(){
  if(state.rangeStart===state.rangeEnd)return '';
  const a=state.rangeStart,b=state.rangeEnd;
  const label=yearOf(a)===yearOf(b)
    ?cap(monthNames[monthOf(a)-1])+' – '+cap(monthNames[monthOf(b)-1])
    :cap(monthNames[monthOf(a)-1])+' '+yearOf(a)+' – '+cap(monthNames[monthOf(b)-1])+' '+yearOf(b);
  return '<div class="payment-period-pill"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="17" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M2.5 9.5h19M7 2v5M17 2v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>'+esc(label)+'</span></div>';
}
function rangeText(){const a=state.rangeStart,b=state.rangeEnd,am=monthOf(a),bm=monthOf(b);if(a===b)return cap(monthNames[am-1])+' '+yearOf(a);if(a%12===0&&b%12===11)return yearOf(a)===yearOf(b)?String(yearOf(a)):`${yearOf(a)}–${yearOf(b)} годы`;if(yearOf(a)===yearOf(b)&&am%3===1&&bm%3===0){const q1=Math.floor((am-1)/3),q2=Math.floor((bm-1)/3);return q1===q2?`${['I','II','III','IV'][q1]} квартал`:`${['I','II','III','IV'][q1]}–${['I','II','III','IV'][q2]} кварталы`};return `${monthShort[am-1]} ${yearOf(a)} — ${monthShort[bm-1]} ${yearOf(b)}`}
function rangeChip(){const a=state.rangeStart,b=state.rangeEnd,months=cap(monthNames[monthOf(a)-1])+(a===b?'':' — '+cap(monthNames[monthOf(b)-1])),year=String(yearOf(a))+(yearOf(a)===yearOf(b)?'':'–'+yearOf(b));return '<button type="button" class="range-chip" data-open-range aria-label="Период: '+esc(months)+' '+esc(year)+'. Изменить период"><svg class="range-calendar" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="17" rx="2" stroke="currentColor" stroke-width="2"/><path d="M2.5 9.5h19M7 2v5M17 2v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="7" cy="13" r="1.1" fill="currentColor"/><circle cx="12" cy="13" r="1.1" fill="currentColor"/><circle cx="17" cy="13" r="1.1" fill="currentColor"/><circle cx="7" cy="17" r="1.1" fill="currentColor"/><circle cx="12" cy="17" r="1.1" fill="currentColor"/><circle cx="17" cy="17" r="1.1" fill="currentColor"/></svg><span class="range-months">'+esc(months)+'</span><span class="range-divider" aria-hidden="true"></span><span class="range-year">'+esc(year)+'</span></button>'}
function quarterRangeText(){const a=state.rangeStart,b=state.rangeEnd,q1=Math.floor((monthOf(a)-1)/3),q2=Math.floor((monthOf(b)-1)/3);return yearOf(a)===yearOf(b)&&q1===q2?['I','II','III','IV'][q1]+' кв.':`${['I','II','III','IV'][q1]}–${['I','II','III','IV'][q2]} кв.`}
function monthRangeText(){const a=state.rangeStart,b=state.rangeEnd;return cap(monthNames[monthOf(a)-1])+(a===b?'':' – '+cap(monthNames[monthOf(b)-1]))}
function chooseRange(a,b){
  if(state.section==='accruals'&&state.view==='employee')replace({...state,rangeStart:a,rangeEnd:b,employeeAllPeriods:false});
  else if(state.section==='accruals'&&(state.view==='body_repair_accruals'||state.view==='mechanical_repair_accruals'||state.view==='body_repair_work_orders'))replace({...state,rangeStart:a,rangeEnd:b});
  else if(state.section==='payments'&&state.view==='payment_employee')replace({...state,rangeStart:a,rangeEnd:b,payment_id:null});
  else if(state.section==='payments'&&state.view==='list')replace({...state,rangeStart:a,rangeEnd:b,payment_id:null});
  else if(state.section==='balance'&&state.view==='employee_balance')replace({...state,rangeStart:a,rangeEnd:b});
  else replace({...state,rangeStart:a,rangeEnd:b,view:'list',employee_id:null,reporting_period_id:null,source_code:null,payment_id:null});
}
function addAdjacent(a,b){if(state.section==='accruals'&&state.view==='employee'&&state.employeeAllPeriods){chooseRange(a,b);return}let s=state.rangeStart,e=state.rangeEnd;if(a===s&&b===e)return;if(b===s-1)s=a;else if(a===e+1)e=b;else if(a===s&&b<e)s=b+1;else if(b===e&&a>s)e=a-1;else{s=a;e=b}chooseRange(s,e)}
function quarterIcon(q){const a=(q-1)*90,b=q*90;return `<span class="quarter-wheel" aria-hidden="true" style="background:conic-gradient(from 0deg,#fff 0deg,#fff ${a}deg,#24218d ${a}deg,#24218d ${b}deg,#fff ${b}deg,#fff 360deg)"></span>`}
function rangeIcon(){const colors=[1,2,3,4].map(q=>{const a=monthKey(yearOf(state.rangeStart),(q-1)*3+1);return state.rangeStart<=a&&state.rangeEnd>=a+2?'#24218d':'#fff'});const segments=colors.map((c,i)=>`${c} ${i*90}deg,${c} ${(i+1)*90}deg`).join(',');return `<span class="quarter-wheel" aria-hidden="true" style="background:conic-gradient(from 0deg,${segments})"></span>`}
function openFilter(tab){filterTab=tab||'quarter';focusYear=yearOf(state.rangeEnd);focusQuarter=Math.floor((monthOf(state.rangeEnd)-1)/3)+1;filterOpen=true;renderFilter()}
function calendarIcon(year=false){return '<svg class="filter-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="17" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 9.5h19M7 2v5M17 2v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'+(year?'<text x="12" y="18" text-anchor="middle" font-size="8" font-weight="800" fill="currentColor">365</text>':'<path d="M7 13h2m3 0h2m3 0h1M7 17h2m3 0h2" stroke="currentColor" stroke-width="1.6"/>')+'</svg>'}
function chevronIcon(){return '<svg class="filter-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 6 5 5 5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'}
function navIcon(code){const paths={
  accruals:'<rect x="3" y="14" width="4" height="7" rx="2" fill="currentColor"/><rect x="10" y="4" width="4" height="17" rx="2" fill="currentColor"/><rect x="17" y="9" width="4" height="12" rx="2" fill="currentColor"/>',
  payments:'<rect x="2.5" y="5" width="19" height="15" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M2.5 10h19M6 16h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  balance:'<rect x="5" y="2.5" width="14" height="19" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M9 8h5M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  summary:'<path d="M12 2.5v9.5h9.5M10 3a9.5 9.5 0 1 0 11 11h-9.5V3" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'
};return '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">'+paths[code]+'</svg>'}
function filterSummary(open=false){
  const first=monthOf(state.rangeStart),last=monthOf(state.rangeEnd);
  const cleared=state.section==='accruals'&&state.view==='employee'&&state.employeeAllPeriods;
  const selected=cleared||state.rangeStart===state.rangeEnd?'':first===1&&last===12?'year':first%3===1&&last%3===0?'quarter':'month';
  const labels=cleared?[
    ['year','Год','—',calendarIcon(true)],
    ['quarter','Квартал','—','<span class="quarter-wheel" aria-hidden="true" style="background:#fff"></span>'],
    ['month','Месяц','—',calendarIcon(false)]
  ]:[
    ['year','Год',yearOf(state.rangeStart)===yearOf(state.rangeEnd)?yearOf(state.rangeStart):yearOf(state.rangeStart)+'–'+yearOf(state.rangeEnd),calendarIcon(true)],
    ['quarter','Квартал',quarterRangeText(),state.rangeStart===state.rangeEnd?quarterIcon(Math.floor((monthOf(state.rangeStart)-1)/3)+1):rangeIcon()],
    ['month','Месяц',monthRangeText(),calendarIcon(false)]
  ];
  return '<div class="filter-summary">'+labels.map(([tab,title,value,icon])=>'<button class="filter-cell '+(open&&filterTab===tab?'active':'')+' '+(selected===tab?'selected':'')+' '+(!cleared&&tab==='month'&&state.rangeEnd>state.rangeStart?'month-range':'')+'" data-ftab="'+tab+'" aria-label="'+title+': '+esc(value)+'">'+icon+'<span class="filter-text">'+esc(value)+'</span>'+chevronIcon()+'</button>').join('')+'</div>';
}
function renderFilter(){
  const accrualActive=state.section==='accruals'&&(state.view==='list'||state.view==='employee'||state.view==='source'||state.view==='repair_positions'||state.view==='body_repair_accruals'||state.view==='mechanical_repair_accruals'||state.view==='body_repair_work_orders');
  const paymentActive=state.section==='payments'&&(state.view==='list'||state.view==='payment_employee');
  const balanceActive=state.section==='balance';
  const active=accrualActive||paymentActive||balanceActive;
  document.body.classList.toggle('accrual-list',accrualActive);
  document.body.classList.toggle('accrual-employee',accrualActive&&(state.view==='employee'||state.view==='source'||state.view==='repair_positions'));
  document.body.classList.toggle('payment-list',paymentActive);
  document.body.classList.toggle('payment-employee',paymentActive&&state.view==='payment_employee');
  document.body.classList.toggle('balance-list',balanceActive);
  document.body.classList.toggle('filter-open',active&&filterOpen);
  if(!active||!filterOpen){
    if(!active)filterOpen=false;
    $('accrual-overlay').innerHTML='';
    return;
  }
  const ys=[...new Set([...years,...periods.map(p=>Number(p.year)),focusYear])].sort((a,b)=>a-b);
  const yearHtml=ys.map(y=>'<button data-fyear="'+y+'" class="'+(!state.employeeAllPeriods&&state.rangeStart<=monthKey(y,1)&&state.rangeEnd>=monthKey(y,12)?'active':'')+'">'+y+'</button>').join('');
  const quarters=[1,2,3,4].map(q=>{
    const a=monthKey(focusYear,(q-1)*3+1),b=a+2;
    const selected=!state.employeeAllPeriods&&state.rangeStart<=a&&state.rangeEnd>=b;
    return '<button data-fquarter="'+q+'" class="'+(selected?'active':'')+'">'+quarterIcon(q)+'<span class="quarter-copy"><strong>'+['I','II','III','IV'][q-1]+' квартал</strong><small>'+['Январь, Февраль, Март','Апрель, Май, Июнь','Июль, Август, Сентябрь','Октябрь, Ноябрь, Декабрь'][q-1]+'</small></span>'+(selected?'<span class="choice-check" aria-label="Выбран"><svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="m3 9 4 4 8-8" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>':'')+'</button>'
  }).join('');
  const first=(focusQuarter-1)*3;
  const monthsHtml=monthNames.slice(first,first+3).map((name,i)=>{
    const m=first+i+1,k=monthKey(focusYear,m);
    return '<button data-fmonth="'+m+'" class="'+(!state.employeeAllPeriods&&k>=state.rangeStart&&k<=state.rangeEnd?'active':'')+'">'+cap(name)+'</button>'
  }).join('');
  $('accrual-overlay').innerHTML='<div class="filter-backdrop" data-dismiss></div><section class="filter-sheet" role="dialog" aria-label="Выбор периода"><div class="filter-handle" aria-label="Смахнуть вниз для закрытия"></div>'+filterSummary(true)+(filterTab==='year'?'<div class="filter-heading">Год</div><div class="filter-grid years-grid">'+yearHtml+'</div>':'<div class="filter-heading">'+(filterTab==='quarter'?'Кварталы':'Месяцы')+'</div><div class="filter-grid '+(filterTab==='quarter'?'quarters-grid':'months-grid')+'">'+(filterTab==='quarter'?quarters:monthsHtml)+'</div>')+'</section>';
  document.querySelector('[data-dismiss]').onclick=()=>{filterOpen=false;renderFilter()};
  document.querySelectorAll('.filter-sheet [data-ftab]').forEach(el=>el.onclick=()=>{
    filterTab=el.dataset.ftab;
    if(filterTab==='month')focusQuarter=Math.floor((monthOf(state.rangeEnd)-1)/3)+1;
    renderFilter()
  });
  document.querySelectorAll('[data-fyear]').forEach(el=>el.onclick=()=>{
    const y=Number(el.dataset.fyear);focusYear=y;
    if(filterTab==='year')addAdjacent(monthKey(y,1),monthKey(y,12));else renderFilter()
  });
  document.querySelectorAll('[data-fquarter]').forEach(el=>el.onclick=()=>{
    const q=Number(el.dataset.fquarter);focusQuarter=q;
    addAdjacent(monthKey(focusYear,(q-1)*3+1),monthKey(focusYear,(q-1)*3+3))
  });
  document.querySelectorAll('[data-fmonth]').forEach(el=>el.onclick=()=>{
    const k=monthKey(focusYear,Number(el.dataset.fmonth));addAdjacent(k,k)
  });
  const sheet=document.querySelector('.filter-sheet'),handle=document.querySelector('.filter-handle'),backdrop=document.querySelector('.filter-backdrop');
  let startY=null,dragY=0,dragging=false,dismissing=false,pointerId=null;
  function moveDrag(y,e){
    if(startY===null||dismissing)return;
    const delta=Math.max(0,y-startY);
    if(!dragging&&(delta<6||sheet.scrollTop>0))return;
    dragging=true;
    if(e?.cancelable)e.preventDefault();
    dragY=delta;
    sheet.classList.add('dragging');
    sheet.style.setProperty('--drag-y',delta+'px');
    backdrop.style.opacity=String(Math.max(0,1-delta/420));
  }
  function endDrag(y){
    if(startY===null||dismissing)return;
    const shouldClose=dragging&&Math.max(dragY,y-startY)>78;
    startY=null;dragging=false;sheet.classList.remove('dragging');
    if(!shouldClose){sheet.style.setProperty('--drag-y','0px');backdrop.style.opacity='1';return}
    dismissing=true;
    sheet.style.setProperty('--drag-y',Math.max(window.innerHeight,sheet.getBoundingClientRect().height+130)+'px');
    backdrop.style.opacity='0';
    let finished=false;
    const finish=()=>{if(finished)return;finished=true;filterOpen=false;renderFilter()};
    sheet.addEventListener('transitionend',finish,{once:true});
    setTimeout(finish,300);
  }
  sheet.addEventListener('touchstart',e=>{if(pointerId!==null||dismissing)return;startY=e.touches[0].clientY;dragY=0},{passive:true});
  sheet.addEventListener('touchmove',e=>{if(pointerId===null)moveDrag(e.touches[0].clientY,e)},{passive:false});
  sheet.addEventListener('touchend',e=>{if(pointerId===null)endDrag(e.changedTouches[0].clientY)},{passive:true});
  sheet.addEventListener('touchcancel',()=>{if(pointerId===null)endDrag(startY??0)},{passive:true});
  handle.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;pointerId=e.pointerId;startY=e.clientY;dragY=0;handle.setPointerCapture?.(e.pointerId)});
  handle.addEventListener('pointermove',e=>{if(pointerId===e.pointerId)moveDrag(e.clientY,e)});
  handle.addEventListener('pointerup',e=>{if(pointerId===e.pointerId){endDrag(e.clientY);pointerId=null}});
  handle.addEventListener('pointercancel',e=>{if(pointerId===e.pointerId){endDrag(startY??e.clientY);pointerId=null}});
  sheet.addEventListener('click',e=>{if(dragY>6){e.preventDefault();e.stopImmediatePropagation();dragY=0}},true)
}
function quarterMonths(year,q){const start=(q-1)*3+1;return[0,1,2].map(i=>({year,month:start+i}))}
function quarterPeriods(){const months=new Set(quarterMonths(state.year,state.quarter).map(x=>x.month));return periods.filter(p=>Number(p.year)===Number(state.year)&&months.has(Number(p.month))).sort((a,b)=>a.month-b.month)}
function selectedIds(){const qp=quarterPeriods().map(p=>Number(p.id));if(state.selected_period_ids===null)return qp;const valid=new Set(qp);return (state.selected_period_ids||[]).map(Number).filter(id=>valid.has(id))}
function selectedPeriodRows(){const ids=new Set(selectedIds());return periods.filter(p=>ids.has(Number(p.id))).sort((a,b)=>(a.year-b.year)||(a.month-b.month))}

function periodIdsForRange(){
  return periods
    .filter(p=>monthKey(p.year,p.month)>=state.rangeStart&&monthKey(p.year,p.month)<=state.rangeEnd)
    .map(p=>Number(p.id));
}
function paymentDateRange(){
  const a=state.rangeStart,b=state.rangeEnd;
  const ay=yearOf(a),am=monthOf(a),by=yearOf(b),bm=monthOf(b);
  const dateFrom=String(ay)+'-'+String(am).padStart(2,'0')+'-01';
  const lastDay=new Date(Date.UTC(by,bm,0)).getUTCDate();
  const dateTo=String(by)+'-'+String(bm).padStart(2,'0')+'-'+String(lastDay).padStart(2,'0');
  return {dateFrom,dateTo};
}
function chunks(values,size=12){
  const out=[];
  for(let i=0;i<values.length;i+=size)out.push(values.slice(i,i+size));
  return out;
}
function emptyAccrualModel(ids=[]){
  return {
    contract:'staff_cost_accruals',
    version:2,
    generated_at:data.meta.generated_at,
    scope:{period_ids:ids},
    summary:{
      calculated_accrual_total:0,
      accrual_adjustment_total:0,
      accrual_total:0,
      body_accrual_total:0,
      service_advisor_accrual_total:0,
      mechanical_accrual_total:0,
      employee_count:0
    },
    items:[],
    page:{limit:100,offset:0,total_count:0,next_offset:null}
  };
}
function mergeAccrualModels(parts,ids){
  if(!parts.length)return emptyAccrualModel(ids);
  const employees=new Map();
  const summary={
    calculated_accrual_total:0,
    accrual_adjustment_total:0,
    accrual_total:0,
    body_accrual_total:0,
    service_advisor_accrual_total:0,
    mechanical_accrual_total:0,
    employee_count:0
  };
  for(const part of parts){
    for(const field of Object.keys(summary)){
      if(field!=='employee_count')summary[field]+=num(part?.summary?.[field]);
    }
    for(const row of part?.items||[]){
      const id=Number(row.staff_member_id);
      const target=employees.get(id)||{
        staff_member_id:id,
        fio_full:row.fio_full,
        calculated_accrual_total:0,
        accrual_adjustment_total:0,
        accrual_total:0,
        body_accrual_total:0,
        service_advisor_accrual_total:0,
        mechanical_accrual_total:0
      };
      target.fio_full=target.fio_full||row.fio_full;
      for(const field of [
        'calculated_accrual_total','accrual_adjustment_total','accrual_total',
        'body_accrual_total','service_advisor_accrual_total','mechanical_accrual_total'
      ])target[field]+=num(row[field]);
      employees.set(id,target);
    }
  }
  const items=[...employees.values()].sort((a,b)=>num(b.accrual_total)-num(a.accrual_total)||String(a.fio_full||'').localeCompare(String(b.fio_full||''),'ru'));
  summary.employee_count=items.length;
  return {
    contract:'staff_cost_accruals',
    version:2,
    generated_at:parts.map(x=>x?.generated_at).filter(Boolean).at(-1)||data.meta.generated_at,
    scope:{period_ids:ids},
    summary,
    items,
    page:{limit:items.length,offset:0,total_count:items.length,next_offset:null}
  };
}
async function loadAccrualScope(ids){
  const clean=[...new Set((ids||[]).map(Number))].sort((a,b)=>a-b);
  const key=scopeKey(clean);
  if(key===accrualModelKey&&accrualModel)return accrualModel;
  if(!clean.length){
    accrualModel=emptyAccrualModel([]);
    accrualModelKey='';
    return accrualModel;
  }
  const parts=[];
  for(const partIds of chunks(clean,12)){
    let offset=0;
    let aggregate=null;
    const rows=[];
    do{
      const page=await staffCostApi.accruals(partIds,{limit:100,offset});
      touchGenerated(page);
      aggregate=aggregate||page;
      rows.push(...(page.items||[]));
      offset=page?.page?.next_offset;
    }while(offset!=null);
    parts.push({...aggregate,items:rows});
  }
  accrualModel=mergeAccrualModels(parts,clean);
  accrualModelKey=key;
  touchGenerated(accrualModel);
  return accrualModel;
}
async function loadEmployee(staffMemberId,ids){
  const clean=[...new Set((ids||[]).map(Number))].sort((a,b)=>a-b);
  const key=Number(staffMemberId)+':'+scopeKey(clean);
  if(employeeModels.has(key)){
    const cached=employeeModels.get(key);
    accrualEmployeeById.set(Number(staffMemberId),cached);
    return cached;
  }
  const parts=await Promise.all(chunks(clean,12).map(part=>staffCostApi.employee(staffMemberId,part)));
  const periodsOut=parts.flatMap(x=>x?.periods||[])
    .sort((a,b)=>(Number(b.reporting_year)-Number(a.reporting_year))||(Number(b.reporting_month)-Number(a.reporting_month))||Number(b.reporting_period_id)-Number(a.reporting_period_id));
  const model={
    staff_member_id:Number(staffMemberId),
    fio_full:parts.find(x=>x?.fio_full)?.fio_full||staffById.get(Number(staffMemberId))?.fio_full,
    summary:{
      calculated_accrual_total:parts.reduce((sum,x)=>sum+num(x?.summary?.calculated_accrual_total),0),
      accrual_adjustment_total:parts.reduce((sum,x)=>sum+num(x?.summary?.accrual_adjustment_total),0),
      accrual_total:parts.reduce((sum,x)=>sum+num(x?.summary?.accrual_total),0)
    },
    periods:periodsOut
  };
  parts.forEach(touchGenerated);
  employeeModels.set(key,model);
  accrualEmployeeById.set(Number(staffMemberId),model);
  return model;
}
async function loadEmployeeSource(){
  const key=Number(state.employee_id)+':'+Number(state.reporting_period_id)+':'+String(state.source_code);
  let payload=sourceModels.get(key);
  if(!payload){
    payload=await staffCostApi.employeeSource(
      state.employee_id,
      state.reporting_period_id,
      state.source_code
    );
    sourceModels.set(key,payload);
  }
  touchGenerated(payload);
  let employee=accrualEmployeeById.get(Number(state.employee_id));
  if(!employee){
    employee=await loadEmployee(state.employee_id,[Number(state.reporting_period_id)]);
  }
  let period=employee?.periods?.find(x=>Number(x.reporting_period_id)===Number(state.reporting_period_id));
  if(!period){
    const one=await loadEmployee(state.employee_id,[Number(state.reporting_period_id)]);
    period=one?.periods?.[0];
    if(period){
      const periodsKeep=(employee?.periods||[]).filter(x=>Number(x.reporting_period_id)!==Number(period.reporting_period_id));
      employee={...employee,periods:[...periodsKeep,period]};
      accrualEmployeeById.set(Number(state.employee_id),employee);
    }
  }
  let source=period?.sources?.find(x=>String(x.source_code)===String(state.source_code));
  if(source){
    Object.assign(source,payload.source||{}, {items:payload.items||[]});
  }
  return payload;
}
async function loadRepairPositions(){
  await loadEmployeeSource();
  const key=Number(state.employee_id)+':'+Number(state.reporting_period_id)+':'+String(state.source_code)+':'+Number(state.source_item_id);
  let payload=repairModels.get(key);
  if(!payload){
    payload=await staffCostApi.repairPositions(
      state.employee_id,
      state.reporting_period_id,
      state.source_code,
      state.source_item_id
    );
    repairModels.set(key,payload);
  }
  touchGenerated(payload);
  const employee=accrualEmployeeById.get(Number(state.employee_id));
  const period=employee?.periods?.find(x=>Number(x.reporting_period_id)===Number(state.reporting_period_id));
  const source=period?.sources?.find(x=>String(x.source_code)===String(state.source_code));
  const item=source?.items?.find(x=>Number(x.source_item_id)===Number(state.source_item_id));
  if(item){
    Object.assign(item,payload.item||{});
    item.repair_positions=payload.items||[];
    item.repair_position_count=(payload.items||[]).length;
  }
}
async function loadMechanicalAccruals(ids){
  const key=scopeKey(ids);
  if(mechanicalAccrualModel&&mechanicalAccrualModelKey===key)return mechanicalAccrualModel;
  const payload=await staffCostApi.mechanicalRepairAccruals(ids);
  touchGenerated(payload);
  mechanicalAccrualModel=payload;
  mechanicalAccrualModelKey=key;
  return payload;
}
async function loadMechanicalAdvisorSourceRows(ids){
  await loadAccrualScope(ids);
  const people=Array.isArray(accrualModel?.items)?accrualModel.items:[];
  const result=[];
  for(const group of chunks(people,8)){
    const models=await Promise.all(group.map(person=>loadEmployee(person.staff_member_id,ids)));
    result.push(...models);
  }
  return result;
}
async function loadBodyAccruals(ids){
  const key=scopeKey(ids);
  if(bodyAccrualModel&&bodyAccrualModelKey===key)return bodyAccrualModel;
  const payload=await staffCostApi.bodyRepairAccruals(ids);
  touchGenerated(payload);
  bodyAccrualModel=payload;
  bodyAccrualModelKey=key;
  bodyRepairWorkOrders=payload.work_orders||[];
  accrualEmployees=payload.employees||[];
  for(const employee of accrualEmployees){
    accrualEmployeeById.set(Number(employee.staff_member_id),employee);
  }
  return payload;
}
async function loadBodyWorkOrders(ids){
  await loadBodyAccruals(ids);
  const key=scopeKey(ids);
  if(bodyCatalogModel&&bodyCatalogModelKey===key)return bodyCatalogModel;
  const payload=await staffCostApi.bodyRepairWorkOrders(ids,{limit:100});
  touchGenerated(payload);
  bodyCatalogModel=payload;
  bodyCatalogModelKey=key;
  bodyRepairWorkOrderCatalog=payload.items||[];
  return payload;
}
async function loadBillingPayments(){
  const {dateFrom,dateTo}=paymentDateRange();
  const key=dateFrom+':'+dateTo;
  if(billingModel&&billingModelKey===key)return billingModel;
  const payload=await staffCostApi.billingPayments(dateFrom,dateTo,{limit:100});
  touchGenerated(payload);
  billingModel=payload;
  billingModelKey=key;
  billingPayments=payload.items||[];
  return payload;
}
async function loadStaffPayments(){
  const {dateFrom,dateTo}=paymentDateRange();
  const employeeId=state.view==='payment_employee'?Number(state.employee_id):null;
  const key=[dateFrom,dateTo,employeeId??'',state.payment_status_filter||'',state.payment_type_filter||''].join(':');
  if(paymentModel&&paymentModelKey===key)return paymentModel;
  const payload=await staffCostApi.payments(dateFrom,dateTo,{
    staffMemberId:employeeId,
    status:state.payment_status_filter,
    sourceCode:state.payment_type_filter,
    limit:100
  });
  touchGenerated(payload);
  paymentModel=payload;
  paymentModelKey=key;
  payments=payload.items||[];
  return payload;
}
async function loadStatementList(ids){
  const key=scopeKey(ids);
  if(statementModel&&statementModelKey===key)return statementModel;
  const payload=await staffCostApi.statement(ids,{limit:100,offset:0});
  touchGenerated(payload);
  statementModel=payload;
  statementModelKey=key;
  return payload;
}
async function loadStatementEmployee(ids){
  const key=Number(state.employee_id)+':'+scopeKey(ids);
  if(statementEmployeeModel&&statementEmployeeModelKey===key){
    balances=statementEmployeeModel.periods||[];
    payments=statementEmployeeModel.payments||[];
    return statementEmployeeModel;
  }
  const payload=await staffCostApi.statementEmployee(state.employee_id,ids);
  touchGenerated(payload);
  statementEmployeeModel=payload;
  statementEmployeeModelKey=key;
  balances=payload.periods||[];
  payments=payload.payments||[];
  return payload;
}
async function loadStatementMonth(){
  const key=Number(state.employee_id)+':'+Number(state.reporting_period_id);
  if(statementMonthModel&&statementMonthModelKey===key){
    balances=statementMonthModel.balance?[statementMonthModel.balance]:[];
    payments=statementMonthModel.payments||[];
    return statementMonthModel;
  }
  const payload=await staffCostApi.statementMonth(state.employee_id,state.reporting_period_id);
  touchGenerated(payload);
  statementMonthModel=payload;
  statementMonthModelKey=key;
  balances=payload.balance?[payload.balance]:[];
  payments=payload.payments||[];
  return payload;
}
async function loadSummary(ids){
  const key=scopeKey(ids);
  if(summaryModel&&summaryModelKey===key){
    summaries=summaryModel.items||[];
    return summaryModel;
  }
  if(!ids.length){
    summaryModel={items:[],generated_at:data.meta.generated_at};
    summaryModelKey=key;
    summaries=[];
    return summaryModel;
  }
  const payload=await staffCostApi.summary(ids);
  touchGenerated(payload);
  summaryModel=payload;
  summaryModelKey=key;
  summaries=payload.items||[];
  return payload;
}
async function ensureViewData(){
  const rangeIds=periodIdsForRange();
  if(state.section==='accruals'){
    if(state.view==='employee'){
      await loadAccrualScope(rangeIds);
      await loadEmployee(state.employee_id,state.employeeAllPeriods?allAccrualIds():rangeIds);
      return;
    }
    if(state.view==='source'){
      await loadAccrualScope(rangeIds);
      await loadEmployee(state.employee_id,state.employeeAllPeriods?allAccrualIds():rangeIds);
      await loadEmployeeSource();
      return;
    }
    if(state.view==='repair_positions'){
      await loadAccrualScope(rangeIds);
      await loadEmployee(state.employee_id,state.employeeAllPeriods?allAccrualIds():rangeIds);
      await loadRepairPositions();
      return;
    }
    if(state.view==='body_repair_accruals'){
      await Promise.all([loadAccrualScope(rangeIds),loadBodyAccruals(rangeIds)]);
      return;
    }
    if(state.view==='mechanical_service_advisor_accruals'){
      accrualEmployees=await loadMechanicalAdvisorSourceRows(rangeIds);
      return;
    }
    if(state.view==='mechanical_repair_accruals'){
      await loadMechanicalAccruals(rangeIds);
      return;
    }
    if(state.view==='body_repair_work_orders'){
      await Promise.all([loadAccrualScope(rangeIds),loadBodyWorkOrders(rangeIds)]);
      return;
    }
    if(state.view==='billing_payments'){
      await loadBillingPayments();
      return;
    }
    await Promise.all([loadAccrualScope(rangeIds),loadBodyAccruals(rangeIds)]);
    return;
  }
  if(state.section==='payments'){
    if(state.view==='payment'){
      if(!payments.some(x=>Number(x.id)===Number(state.payment_id)))await loadStaffPayments();
      return;
    }
    await loadStaffPayments();
    return;
  }
  if(state.section==='balance'){
    if(state.view==='employee_balance'){
      await Promise.all([loadStatementList(rangeIds),loadStatementEmployee(rangeIds)]);
      return;
    }
    if(state.view==='balance_month'){
      await loadStatementMonth();
      return;
    }
    await loadStatementList(rangeIds);
    return;
  }
  if(state.section==='summary'){
    await loadSummary(selectedIds());
  }
}
const prefetchedScopes=new Set();
function prefetchPrimaryViews(){
  const rangeIds=periodIdsForRange();
  const key=scopeKey(rangeIds)+':'+state.rangeStart+':'+state.rangeEnd;
  if(prefetchedScopes.has(key)||!rangeIds.length)return;
  prefetchedScopes.add(key);
  const {dateFrom,dateTo}=paymentDateRange();
  const tasks=[
    staffCostApi.payments(dateFrom,dateTo,{limit:100}),
    staffCostApi.statement(rangeIds,{limit:100,offset:0})
  ];
  const summaryIds=selectedIds();
  if(summaryIds.length)tasks.push(staffCostApi.summary(summaryIds));
  Promise.allSettled(tasks);
}
let continuationObserver=null;
let continuationBusy=false;
function mergeUniqueRows(current,next,key){
  const map=new Map((current||[]).map(row=>[String(row?.[key]),row]));
  for(const row of next||[])map.set(String(row?.[key]),row);
  return [...map.values()];
}
function continuationStateKey(){
  return [
    state.section,state.view,state.employee_id||'',state.rangeStart,state.rangeEnd,
    state.payment_status_filter||'',state.payment_type_filter||'',scopeKey(periodIdsForRange())
  ].join('|');
}
function installCurrentContinuation(){
  continuationObserver?.disconnect();
  continuationObserver=null;
  if(continuationBusy)return;

  let loader=null;

  if(state.section==='payments'&&(state.view==='list'||state.view==='payment_employee')&&paymentModel?.page?.has_more&&paymentModel?.page?.next_cursor){
    loader=async()=>{
      const {dateFrom,dateTo}=paymentDateRange();
      const next=await staffCostApi.payments(dateFrom,dateTo,{
        staffMemberId:state.view==='payment_employee'?Number(state.employee_id):null,
        status:state.payment_status_filter,
        sourceCode:state.payment_type_filter,
        limit:100,
        cursor:paymentModel.page.next_cursor
      });
      payments=mergeUniqueRows(payments,next.items,'id')
        .sort((a,b)=>String(b.payment_date).localeCompare(String(a.payment_date))||Number(b.id)-Number(a.id));
      paymentModel={...paymentModel,items:payments,page:next.page,generated_at:next.generated_at};
      touchGenerated(next);
    };
  }else if(state.section==='accruals'&&state.view==='body_repair_work_orders'&&bodyCatalogModel?.page?.has_more&&bodyCatalogModel?.page?.next_cursor){
    loader=async()=>{
      const next=await staffCostApi.bodyRepairWorkOrders(periodIdsForRange(),{
        limit:100,
        cursor:bodyCatalogModel.page.next_cursor
      });
      bodyRepairWorkOrderCatalog=mergeUniqueRows(bodyRepairWorkOrderCatalog,next.items,'work_order_id')
        .sort((a,b)=>String(b.work_order_date||'').localeCompare(String(a.work_order_date||''))||Number(b.work_order_id)-Number(a.work_order_id));
      bodyCatalogModel={...bodyCatalogModel,items:bodyRepairWorkOrderCatalog,page:next.page,generated_at:next.generated_at};
      touchGenerated(next);
    };
  }else if(state.section==='accruals'&&state.view==='billing_payments'&&billingModel?.page?.has_more&&billingModel?.page?.next_cursor){
    loader=async()=>{
      const {dateFrom,dateTo}=paymentDateRange();
      const next=await staffCostApi.billingPayments(dateFrom,dateTo,{
        limit:100,
        cursor:billingModel.page.next_cursor
      });
      billingPayments=mergeUniqueRows(billingPayments,next.items,'payment_id')
        .sort((a,b)=>String(b.payment_date||'').localeCompare(String(a.payment_date||''))||Number(b.payment_id)-Number(a.payment_id));
      billingModel={...billingModel,items:billingPayments,page:next.page,generated_at:next.generated_at};
      touchGenerated(next);
    };
  }else if(state.section==='balance'&&state.view==='list'&&statementModel?.page?.next_offset!=null){
    loader=async()=>{
      const next=await staffCostApi.statement(periodIdsForRange(),{
        limit:100,
        offset:statementModel.page.next_offset
      });
      const items=mergeUniqueRows(statementModel.items,next.items,'staff_member_id');
      statementModel={...statementModel,items,page:next.page,generated_at:next.generated_at};
      touchGenerated(next);
    };
  }

  if(!loader)return;

  const root=$('content');
  if(!root)return;
  const sentinel=document.createElement('div');
  sentinel.setAttribute('aria-hidden','true');
  sentinel.style.cssText='height:1px;width:1px;opacity:0;pointer-events:none';
  root.appendChild(sentinel);

  const expected=continuationStateKey();
  continuationObserver=new IntersectionObserver(async entries=>{
    if(continuationBusy||!entries.some(entry=>entry.isIntersecting))return;
    continuationBusy=true;
    continuationObserver?.disconnect();
    continuationObserver=null;
    try{
      await loader();
      if(expected===continuationStateKey())await render();
    }catch(error){
      console.error('staff_cost_continuation_failed',error instanceof Error?error.message:String(error));
    }finally{
      continuationBusy=false;
    }
  },{rootMargin:'700px 0px'});
  continuationObserver.observe(sentinel);
}

function periodLabel(id,full=false){const p=periodById.get(Number(id));return p?`${full?cap(monthNames[p.month-1]):monthShort[p.month-1]} ’${String(p.year).slice(-2)}`:'—'}
function signClass(v){return num(v)>0?'positive':num(v)<0?'negative':'neutral'}
const telegramWebApp=globalThis?.Telegram?.WebApp;
const telegramBackButton=telegramWebApp?.BackButton;
function syncTelegramBackButton(){
  if(!telegramBackButton)return;
  if(Number(state.depth)>0)telegramBackButton.show?.();
  else telegramBackButton.hide?.();
}
function handleTelegramBack(){
  if(Number(state.depth)>0)history.back();
}
telegramBackButton?.onClick?.(handleTelegramBack);
function push(next){state={...next,depth:(state.depth||0)+1};history.pushState({staffCost:true,...state},'');syncTelegramBackButton();render()}
let accrualListScroll=null;
function setAccrualScroll(top,contentTop=0){
  const root=document.scrollingElement||document.documentElement;
  if(root)root.scrollTop=top;
  $('content').scrollTop=contentTop;
  window.scrollTo(0,top);
}
function openAccrualEmployee(id){
  const root=document.scrollingElement||document.documentElement;
  accrualListScroll={depth:state.depth,top:root?.scrollTop??window.scrollY,contentTop:$('content').scrollTop,restoration:history.scrollRestoration};
  if('scrollRestoration' in history)history.scrollRestoration='manual';
  push({...state,view:'employee',employee_id:id,employeeAllPeriods:false});
  setAccrualScroll(0);
  requestAnimationFrame(()=>{if(state.section==='accruals'&&state.view==='employee')setAccrualScroll(0)});
}
function replace(next){state={...next};history.replaceState({staffCost:true,...state},'');render()}
function goSection(section){if(section===state.section&&state.view==='list')return;push({...state,section,view:'list',employee_id:null,employeeAllPeriods:false,reporting_period_id:null,payment_id:null})}
function chooseYear(year){replace({...state,year:Number(year),quarter:1,selected_period_ids:null,view:'list',employee_id:null,reporting_period_id:null,payment_id:null})}
function chooseQuarter(q){replace({...state,quarter:Number(q),selected_period_ids:null,view:'list',employee_id:null,reporting_period_id:null,payment_id:null})}
function toggleMonth(id){const qp=quarterPeriods().map(p=>Number(p.id)),n=Number(id);let ids;if(state.selected_period_ids===null){ids=[n]}else{ids=selectedIds();ids=ids.includes(n)?ids.filter(x=>x!==n):[...ids,n];ids.sort((a,b)=>qp.indexOf(a)-qp.indexOf(b))}replace({...state,selected_period_ids:ids,view:'list',employee_id:null,reporting_period_id:null,payment_id:null})}
function toggleAllMonths(){const qp=quarterPeriods().map(p=>Number(p.id)),ids=selectedIds(),allActive=qp.length>0&&ids.length===qp.length;replace({...state,selected_period_ids:allActive?[]:null,view:'list',employee_id:null,reporting_period_id:null,payment_id:null})}
function renderChrome(){const generated=data?.meta?.generated_at?new Date(data.meta.generated_at):null;$('snapshot').textContent=generated&&!Number.isNaN(generated.valueOf())?`Данные на ${generated.toLocaleString('ru-RU',{timeZone:'Asia/Yekaterinburg',day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',','')} EKB`:'';$('tabs').innerHTML=Object.entries(sectionLabels).map(([code,label])=>`<button class="tab ${code===state.section?'active':''}" data-section="${code}">${navIcon(code)}<span>${label}</span></button>`).join('');document.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>goSection(b.dataset.section));$('years').innerHTML=years.map(y=>`<button class="selector year ${Number(y)===Number(state.year)?'active':''}" data-year="${y}">${String(y).slice(-2)}</button>`).join('');document.querySelectorAll('[data-year]').forEach(b=>b.onclick=()=>chooseYear(b.dataset.year));$('quarters').innerHTML=[1,2,3,4].map(q=>`<button class="selector quarter ${q===Number(state.quarter)?'active':''}" data-quarter="${q}">${['I','II','III','IV'][q-1]} кв.</button>`).join('');document.querySelectorAll('[data-quarter]').forEach(b=>b.onclick=()=>chooseQuarter(b.dataset.quarter));const qm=quarterMonths(state.year,state.quarter),qp=quarterPeriods(),ids=selectedIds(),allActive=qp.length>0&&ids.length===qp.length;$('months').innerHTML=`<button class="selector all ${allActive?'active':''}" data-all="1" ${qp.length?'':'disabled'}>Все</button>`+qm.map(x=>{const p=qp.find(k=>Number(k.month)===x.month);return `<button class="selector month ${p&&ids.includes(Number(p.id))?'active':''}" ${p?'data-period="'+p.id+'"':'disabled'}>${cap(monthNames[x.month-1])}</button>`}).join('');document.querySelector('[data-all]')?.addEventListener('click',toggleAllMonths);document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>toggleMonth(b.dataset.period));$('controls').classList.toggle('hide',state.view!=='list')}
function hero(label,value,sideValue,sideLabel,metrics=[]){return `<div class="hero"><div><div class="hero-label">${esc(label)}</div><div class="hero-value">${value}</div></div><div class="hero-side"><b>${sideValue}</b><span>${esc(sideLabel)}</span></div></div>${metrics.length?`<div class="submetrics">${metrics.map(m=>`<div class="metric"><span>${esc(m[0])}</span><b class="${m[2]||''}">${m[1]}</b></div>`).join('')}</div>`:''}`}
function empty(text='Нет данных для выбранного периода'){return `<div class="empty">${esc(text)}</div>`}
function renderAccruals(){
  const scope=currentAccrualAggregate();
  const list=Array.isArray(scope?.employees)?scope.employees:[];
  const total=num(scope?.accrual_total),body=num(scope?.body_accrual_total),advisor=num(scope?.service_advisor_accrual_total),mech=num(scope?.mechanical_accrual_total);
  const generated=data?.meta?.generated_at?new Date(data.meta.generated_at):null,stamp=generated&&!Number.isNaN(generated.valueOf())?generated.toLocaleString('ru-RU',{timeZone:'Asia/Yekaterinburg',day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',','')+' ЕКБ':'';
  $('content').innerHTML='<div class="summary-sticky"><div class="hero"><div class="hero-top"><div class="hero-label">Начисление</div><div class="accrual-snapshot"><span class="snapshot-dot" aria-hidden="true"></span>Данные на '+esc(stamp)+'</div></div><div class="hero-bottom"><div class="hero-value">'+rub(total)+'</div><div class="hero-count"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="7" r="3.3"/><path d="M2.5 19c0-3.6 2.8-6.2 6.5-6.2s6.5 2.6 6.5 6.2v1H2.5z"/><circle cx="17.4" cy="8" r="2.6"/><path d="M17 13.1c2.9 0 4.5 2.1 4.5 5.1v1.8h-3.6v-1c0-2-.7-3.8-2.1-5.2.4-.3.8-.5 1.2-.7z"/></svg><div><strong>'+num(scope?.employee_count)+'</strong><span>сотрудников</span></div></div></div></div>' + renderAccrualCards({body,advisor,mech},rub) + '</div>'+filterSummary(false).replace('class="filter-summary"','class="filter-summary filter-dock"')+'<div class="section-title"><h2>Сотрудники</h2><span>'+num(scope?.employee_count)+' строк</span></div>'+(list.length?'<div class="list">'+list.map(x=>'<button class="item" data-emp="'+x.staff_member_id+'"><div class="item-top"><div class="item-main"><div class="name">'+esc(shortName(x.fio_full))+'</div></div><div class="amount">'+rub(x.accrual_total)+'</div><svg class="chev" viewBox="0 0 20 20" fill="none"><path d="m7.5 4.8 5.2 5.2-5.2 5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></div></button>').join('')+'</div>':empty());
  document.querySelectorAll('.filter-dock [data-ftab]').forEach(b=>b.onclick=()=>openFilter(b.dataset.ftab));
  document.querySelector('[data-body-repair]')?.addEventListener('click',openBodyRepairAccruals);
  document.querySelector('[data-mechanical-repair]')?.addEventListener('click',openMechanicalRepairAccruals);
  document.querySelector('[data-mechanical-service-advisor]')?.addEventListener('click',openMechanicalServiceAdvisorAccruals);
  document.querySelectorAll('[data-emp]').forEach(b=>b.onclick=()=>openAccrualEmployee(Number(b.dataset.emp)));
}
function workOrderCountLabel(v){const n=Math.abs(Math.trunc(num(v)));return `${n} ${countWord(n,'наряд','наряда','нарядов')}`}
function bodyDateText(v){if(!v)return 'Дата не указана';const d=new Date(String(v)+'T00:00:00');return Number.isNaN(d.valueOf())?'Дата не указана':d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'})}
function bodyDecimal(v){return new Intl.NumberFormat('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:2,useGrouping:false}).format(Number(v)||0)}
function bodyPercent(v){return bodyDecimal(v)+'%'}
function bodyEmployeeCountLabel(v){const n=Math.abs(Math.trunc(num(v)));return `${n} ${countWord(n,'сотрудник','сотрудника','сотрудников')}`}
function bodyRepairEmployeeGroups(){
  const ids=new Set(accrualIds());
  return accrualEmployees.map(employee=>{
    const items=[];
    (Array.isArray(employee?.periods)?employee.periods:[]).forEach(period=>{
      if(!ids.has(Number(period.reporting_period_id)))return;
      const source=(Array.isArray(period.sources)?period.sources:[]).find(s=>String(s.source_code)==='body_repair_worker');
      (Array.isArray(source?.items)?source.items:[]).forEach(item=>items.push({...item,reporting_period_id:Number(period.reporting_period_id),reporting_year:Number(period.reporting_year),reporting_month:Number(period.reporting_month)}));
    });
    if(!items.length)return null;
    items.sort((a,b)=>String(b.work_order_date||'').localeCompare(String(a.work_order_date||''))||Number(b.work_order_id)-Number(a.work_order_id));
    return {
      staff_member_id:Number(employee.staff_member_id),
      fio_full:employee.fio_full,
      work_order_count:new Set(items.map(i=>Number(i.work_order_id)).filter(Number.isFinite)).size,
      accrual_total:additiveSum(items,'accrual_amount'),
      items
    };
  }).filter(Boolean).sort((a,b)=>num(b.accrual_total)-num(a.accrual_total)||String(a.fio_full||'').localeCompare(String(b.fio_full||''),'ru'));
}
function bodyRepairWorkOrderStatusLabel(status){
  if(status==='in_progress')return 'В работе';
  if(status==='closed')return 'Закрыт';
  if(status==='cancelled')return 'Аннулирован';
  return status||'Статус не указан';
}
function bodyRepairWorkOrderStatusClass(status){return status==='in_progress'||status==='closed'||status==='cancelled'?status:'other'}
function bodyKtuStatusLabel(status){if(status==='accrued')return 'Начислен';if(status==='in_progress')return 'В работе';return status||'Статус не указан'}
function bodyRepairAccruedMap(){
  const map=new Map();
  bodyRepairWorkOrders.forEach(w=>{
    const periodId=Number(w.reporting_period_id),workOrderId=Number(w.work_order_id);
    if(Number.isFinite(periodId)&&Number.isFinite(workOrderId))map.set(periodId+':'+workOrderId,w);
  });
  return map;
}
function bodyRepairVisibleWorkOrderCount(){
  if(state.view==='body_repair_work_orders'&&bodyCatalogModel)return num(bodyCatalogModel?.summary?.total_count);
  return num(bodyAccrualModel?.summary?.work_order_count);
}
function bodyRepairWorkOrderGroups(){
  const ids=new Set(accrualIds()),noKtu=[],byPeriod=new Map();
  bodyRepairWorkOrderCatalog.forEach(w=>{
    const workOrderId=Number(w.work_order_id);
    if(!Number.isFinite(workOrderId))return;
    const memberships=Array.isArray(w.worker_ktu_periods)?w.worker_ktu_periods:[];
    if(w.has_worker_ktu===false||memberships.length===0){noKtu.push({...w,work_order_id:workOrderId});return}
    memberships.forEach(membership=>{
      const periodId=Number(membership.reporting_period_id);
      if(!ids.has(periodId))return;
      const period=periodById.get(periodId)||{};
      let group=byPeriod.get(periodId);
      if(!group){
        group={
          reporting_period_id:periodId,
          reporting_year:Number(membership.reporting_year??period.year),
          reporting_month:Number(membership.reporting_month??period.month),
          items:[]
        };
        byPeriod.set(periodId,group);
      }
      group.items.push({...w,work_order_id:workOrderId,ktu_period:membership});
    });
  });
  const sortOrders=(a,b)=>String(b.work_order_date||'').localeCompare(String(a.work_order_date||''))||Number(b.work_order_id)-Number(a.work_order_id);
  noKtu.sort(sortOrders);
  const monthGroups=[...byPeriod.values()].map(group=>({...group,items:group.items.sort(sortOrders)}))
    .sort((a,b)=>num(b.reporting_year)-num(a.reporting_year)||num(b.reporting_month)-num(a.reporting_month)||num(b.reporting_period_id)-num(a.reporting_period_id));
  return {noKtu,monthGroups};
}
function bodyEmployeeIcon(){return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.9"/><path d="M4.5 21c0-4.2 3.2-7 7.5-7s7.5 2.8 7.5 7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'}
function bodyChevron(open=false){return `<svg class="body-chevron ${open?'open':''}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
function bodyWorkOrderChevron(){return '<svg class="body-wo-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7.5 4.8 5.2 5.2-5.2 5.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'}
function bodyRepairHeader(title){
  const generated=data?.meta?.generated_at?new Date(data.meta.generated_at):null;
  const stamp=generated&&!Number.isNaN(generated.valueOf())?generated.toLocaleString('ru-RU',{timeZone:'Asia/Yekaterinburg',day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',','')+' ЕКБ':'';
  return `<div class="body-repair-heading"><button type="button" class="body-repair-back" data-body-back aria-label="Назад"><svg viewBox="0 0 24 24" fill="none"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="body-repair-heading-copy"><h1>${esc(title)}</h1><div class="accrual-snapshot"><span class="snapshot-dot" aria-hidden="true"></span>Данные на ${esc(stamp)}</div></div></div>`;
}
function bodyRepairWorkOrderCard(item){
  const auto=[item.automobile_make,item.automobile_model].filter(Boolean).join(' ')||'Автомобиль не указан';
  const customer=item.customer_display_name_short||item.customer_display_name||'Клиент не указан';
  const plate=item.registration_plate||'Госномер не указан';
  return `<article class="body-wo-card" data-work-order-id="${Number(item.work_order_id)||''}">
    <div class="body-wo-top"><div class="body-wo-number">ЗН № ${esc(item.work_order_number||item.work_order_id||'—')}</div><div class="body-money-chips"><span class="body-money-chip work">Раб: <b>${rub(item.repair_final_amount)}</b></span><span class="body-money-chip parts">ЗЧ: <b>${rub(item.parts_final_amount)}</b></span><span class="body-money-chip materials">Расх: <b>${rub(item.material_final_amount)}</b></span></div></div>
    <div class="body-wo-meta">${esc(bodyDateText(item.work_order_date))}<span>•</span>${esc(auto)}<span>•</span>${esc(customer)}</div>
    <div class="body-wo-plate">${esc(plate)}</div>
    <div class="body-calc-grid"><div class="${String(item.calculation_base_mode)==='manual'?'base-manual':''}"><span>База</span><b>${rub(item.calculation_base_amount)}</b></div><div><span>КТУ</span><b>${esc(bodyDecimal(item.ktu))}</b></div><div><span>Процент</span><b>${esc(bodyPercent(item.compensation_percent))}</b></div><div class="accent"><span>Начислено</span><b>${rub(item.accrual_amount)}</b></div></div>
    ${bodyWorkOrderChevron()}
  </article>`;
}
function mechanicalHours(v){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(num(v))+' ч'}
function openMechanicalServiceAdvisorAccruals(){push({...state,view:'mechanical_service_advisor_accruals',employee_id:null,reporting_period_id:null,source_code:null,source_item_id:null,collapsed_body_employee_ids:[]});setAccrualScroll(0)}
function openMechanicalRepairAccruals(){push({...state,view:'mechanical_repair_accruals',employee_id:null,reporting_period_id:null,source_code:null,source_item_id:null,collapsed_body_employee_ids:[]});setAccrualScroll(0)}
function openBodyRepairAccruals(){push({...state,view:'body_repair_accruals',employee_id:null,reporting_period_id:null,source_code:null,source_item_id:null,collapsed_body_employee_ids:[]});setAccrualScroll(0)}
function openBodyRepairWorkOrders(){push({...state,view:'body_repair_work_orders'});setAccrualScroll(0)}
function bodyRepairCatalogCard(w,membership=null,accruedMap=null){
  const auto=[w.automobile_make,w.automobile_model].filter(Boolean).join(' ')||'Автомобиль не указан';
  const customer=w.customer_display_name_short||w.customer_display_name||'Клиент не указан';
  const plate=w.registration_plate||'Госномер не указан';
  const status=bodyRepairWorkOrderStatusLabel(w.work_order_status);
  const statusClass=bodyRepairWorkOrderStatusClass(w.work_order_status);
  const accrued=membership&&accruedMap?accruedMap.get(Number(membership.reporting_period_id)+':'+Number(w.work_order_id)):null;
  const accruedWorkers=new Map((Array.isArray(accrued?.workers)?accrued.workers:[]).map(x=>[Number(x.staff_member_id),x]));
  const workers=membership?(Array.isArray(membership.workers)?membership.workers:[]).map(worker=>{
    const recognized=accruedWorkers.get(Number(worker.staff_member_id));
    const amount=recognized?'<strong>'+rub(recognized.accrual_amount)+'</strong>':'';
    return '<div class="body-worker-row"><span>'+esc(shortName(worker.fio_full))+'</span><span>КТУ '+esc(bodyDecimal(worker.ktu))+' · '+esc(bodyKtuStatusLabel(worker.ktu_status))+'</span>'+amount+'</div>';
  }).join(''):'';
  const workerCount=membership?num(membership.worker_count):0;
  const ktuBody=membership
    ?'<div class="body-workers-head"><span>Кузовщики</span><b>'+esc(bodyEmployeeCountLabel(workerCount))+'</b></div><div class="body-workers">'+(workers||'<div class="body-worker-empty">Состав КТУ не указан</div>')+'</div>'
    :'<div class="body-no-ktu">КТУ не назначен</div>';
  const ps=w.payment_summary&&typeof w.payment_summary==='object'?w.payment_summary:{};
  const paymentState=String(ps.payment_state||'unpaid');
  const paidTotal=num(ps.paid_total),balance=num(ps.balance_due),paymentCount=num(ps.payment_count);
  const paymentText=paymentState==='partial'
    ?'Оплачено '+rub(paidTotal)+' · Остаток '+rub(balance)
    :paymentState==='paid'
      ?'Оплачено полностью · '+rub(paidTotal)
      :paymentState==='overpaid'
        ?'Оплачено '+rub(paidTotal)+' · Переплата '+rub(Math.abs(balance))
        :'Нет оплат · К оплате '+rub(balance||w.total_final_amount);
  const paymentMeta=paymentCount
    ?paymentCount+' '+countWord(paymentCount,'платёж','платежа','платежей')+(ps.last_payment_date?' · последняя '+new Date(ps.last_payment_date+'T00:00:00').toLocaleDateString('ru-RU'):'')
    :'Платежей пока нет';
  const paymentBlock='<div class="body-client-payment '+esc(paymentState)+'"><div class="body-client-payment-main"><span>Оплата клиента</span><strong>'+esc(paymentText)+'</strong></div><div class="body-client-payment-meta">'+esc(paymentMeta)+'</div></div>';
  const accruedFooter=accrued?'<div class="body-order-accrual-footer"><span>Начислено кузовщикам</span><strong>'+rub(accrued.accrual_total)+'</strong></div>':'';
  return '<article class="body-order-card"><div class="body-order-head"><div><strong>ЗН № '+esc(w.work_order_number||w.work_order_id||'—')+'</strong><small>'+esc(bodyDateText(w.work_order_date))+'</small></div><span class="body-order-status '+statusClass+'">'+esc(status)+'</span></div><div class="body-order-context"><strong>'+esc(auto)+'</strong><span>'+esc(customer)+'</span><span class="body-order-plate">'+esc(plate)+'</span></div><div class="body-money-chips body-order-money"><span class="body-money-chip work">Раб: <b>'+rub(w.repair_final_amount)+'</b></span><span class="body-money-chip parts">ЗЧ: <b>'+rub(w.parts_final_amount)+'</b></span><span class="body-money-chip materials">Расх: <b>'+rub(w.material_final_amount)+'</b></span></div><div class="body-order-total"><span>Итого по ЗН</span><strong>'+rub(w.total_final_amount)+'</strong></div>'+paymentBlock+ktuBody+accruedFooter+'</article>';
}
function bodyRepairGroupHeading(title,count,subtitle=''){
  return '<div class="body-month-heading"><div><h2>'+esc(title)+'</h2>'+(subtitle?'<small>'+esc(subtitle)+'</small>':'')+'</div><span>'+esc(workOrderCountLabel(count))+'</span></div>';
}
function openBillingPayments(){push({...state,view:'billing_payments'});setAccrualScroll(0)}
function clientPaymentMonthKey(value){const m=String(value||'').match(/^(\d{4})-(\d{2})/);return m?monthKey(Number(m[1]),Number(m[2])):null}
function billingPaymentRows(){
  return billingPayments.slice().sort((a,b)=>String(b.payment_date||'').localeCompare(String(a.payment_date||''))||num(b.payment_id)-num(a.payment_id));
}
function billingPaymentRow(p){
  const allocations=Array.isArray(p.allocations)?p.allocations:[];
  const date=p.payment_date?new Date(p.payment_date+'T00:00:00').toLocaleDateString('ru-RU'):'—';
  const payer=p.payer_display_name_short||p.payer_display_name||'Плательщик не указан';
  const recipient=p.recipient_display_name_short||p.recipient_display_name||'Получатель не указан';
  const allocationTitle=allocations.length===0
    ?'Не распределён'
    :allocations.length===1
      ?'ЗН № '+esc(allocations[0].work_order_number||allocations[0].service_work_order_id||'—')
      :allocations.length+' '+countWord(allocations.length,'распределение','распределения','распределений');
  const allocationContext=allocations.length
    ?allocations.map(a=>{
        const auto=[a.automobile_make,a.automobile_model].filter(Boolean).join(' ');
        const wo='ЗН № '+(a.work_order_number||a.service_work_order_id||'—');
        const ctx=[wo,auto,a.registration_plate,a.customer_display_name_short||a.customer_display_name].filter(Boolean).join(' · ');
        return ctx+' → '+rub(a.amount);
      }).join(' / ')
    :'Пока никуда не отнесён';
  const moneyContext='Распределено '+rub(p.allocated_total)+' · Остаток '+rub(p.unallocated_amount);
  const partyContext=payer+' → '+recipient;
  return '<article class="client-payment-row"><div class="client-payment-main"><div class="client-payment-top"><span class="client-payment-date">'+esc(date)+'</span><span class="client-payment-method">'+esc(p.payment_method_name||p.payment_method_code||'Способ не указан')+'</span></div><div class="client-payment-order">'+allocationTitle+'</div><div class="client-payment-context">'+esc(partyContext)+' · '+esc(moneyContext)+'<br>'+esc(allocationContext)+(p.received_by_fio_full?' · Принял: '+esc(shortName(p.received_by_fio_full)):'')+'</div></div><div class="client-payment-amount">'+rub(p.amount)+'</div></article>';
}
function renderBillingPayments(){
  if(Number(data.version)<12){$('content').innerHTML=empty('Для реестра оплат требуется payload v12');return}
  const rows=billingPaymentRows();
  const total=num(billingModel?.summary?.total_amount);
  const allocated=num(billingModel?.summary?.allocated_total);
  const unallocated=num(billingModel?.summary?.unallocated_total);
  const remainder=unallocated>0?' · Не распределено '+rub(unallocated):'';
  $('content').innerHTML=bodyRepairHeader('Оплаты клиентов')
    +'<div class="client-payment-summary"><div><span>Получено за выбранный период</span><strong>'+rub(total)+'</strong></div><small>'+esc(num(billingModel?.summary?.total_count)+' '+countWord(num(billingModel?.summary?.total_count),'платёж','платежа','платежей'))+' · Распределено '+esc(rub(allocated))+esc(remainder)+'</small></div>'
    +'<div class="body-register-heading"><h2>Реестр поступлений</h2><span>по дате платежа</span></div>'
    +(rows.length?'<div class="client-payment-list">'+rows.map(billingPaymentRow).join('')+'</div>':empty('Нет клиентских поступлений за выбранный период'))
    +filterSummary(false).replace('class="filter-summary"','class="filter-summary filter-dock"');
  document.querySelector('[data-body-back]')?.addEventListener('click',()=>history.back());
  document.querySelectorAll('.filter-dock [data-ftab]').forEach(b=>b.onclick=()=>openFilter(b.dataset.ftab));
}
function renderBodyRepairWorkOrders(){
  if(Number(data.version)<12){$('content').innerHTML=empty('Для кузовных заказ-нарядов требуется payload v12');return}
  const groups=bodyRepairWorkOrderGroups();
  const accruedMap=bodyRepairAccruedMap();
  const uniqueCount=bodyRepairVisibleWorkOrderCount();
  const total=num(currentAccrualAggregate().body_accrual_total);
  const clientPaymentCount=num(bodyCatalogModel?.summary?.billing_payment_count);
  const noKtuCards=groups.noKtu.map(w=>bodyRepairCatalogCard(w,null,accruedMap)).join('');
  const noKtuSection='<section class="body-order-group no-ktu">'+bodyRepairGroupHeading('Без КТУ',groups.noKtu.length,'КТУ кузовщиков не назначен')+(noKtuCards?'<div class="body-order-list">'+noKtuCards+'</div>':'<div class="body-group-empty">Нет заказ-нарядов без КТУ</div>')+'</section>';
  const monthSections=groups.monthGroups.map(group=>{
    const title=cap(monthNames[Math.max(1,num(group.reporting_month))-1]||'Период')+' '+num(group.reporting_year);
    const cards=group.items.map(w=>bodyRepairCatalogCard(w,w.ktu_period,accruedMap)).join('');
    return '<section class="body-order-group">'+bodyRepairGroupHeading(title,group.items.length)+'<div class="body-order-list">'+cards+'</div></section>';
  }).join('');
  $('content').innerHTML=bodyRepairHeader('Кузовные заказ-наряды')
    +'<div class="body-summary-grid"><div class="body-summary-card"><span>Начислено по кузовному</span><strong>'+rub(total)+'</strong></div><div class="body-summary-card"><span>Заказ-наряды</span><strong>'+uniqueCount+'</strong></div><button type="button" class="body-summary-card link client-payments" data-body-client-payments><span>Оплаты клиентов · по дате оплаты</span><strong>'+clientPaymentCount+'</strong>'+bodyWorkOrderChevron()+'</button></div>'
    +'<div class="body-register-heading"><h2>Заказ-наряды</h2><span>'+esc(workOrderCountLabel(uniqueCount))+'</span></div>'
    +noKtuSection+monthSections
    +filterSummary(false).replace('class="filter-summary"','class="filter-summary filter-dock"');
  document.querySelector('[data-body-back]')?.addEventListener('click',()=>history.back());
  document.querySelector('[data-body-client-payments]')?.addEventListener('click',openBillingPayments);
  document.querySelectorAll('.filter-dock [data-ftab]').forEach(b=>b.onclick=()=>openFilter(b.dataset.ftab));
}

function employeePeriodText(){
  if(state.employeeAllPeriods)return 'Все периоды';
  const a=state.rangeStart,b=state.rangeEnd,first=cap(monthNames[monthOf(a)-1]);
  if(a===b)return first+' '+yearOf(a);
  return yearOf(a)===yearOf(b)?first+' – '+cap(monthNames[monthOf(b)-1])+' '+yearOf(a):first+' '+yearOf(a)+' – '+cap(monthNames[monthOf(b)-1])+' '+yearOf(b);
}
function renderAccrualEmployee(){
  const employee=accrualEmployeeById.get(Number(state.employee_id));
  const ids=state.employeeAllPeriods?allAccrualIds():accrualIds();
  const idSet=new Set(ids);
  const summaryTotal=employeeAccrualTotal(state.employee_id,ids);
  const rows=(Array.isArray(employee?.periods)?employee.periods:[]).filter(r=>idSet.has(Number(r.reporting_period_id)))
    .sort((a,b)=>(Number(b.reporting_year)-Number(a.reporting_year))||(Number(b.reporting_month)-Number(a.reporting_month)));
  const collapsed=new Set((state.collapsed_period_ids||[]).map(Number));
  const name=shortName(employee?.fio_full||staffById.get(Number(state.employee_id))?.fio_full||'Сотрудник');
  const generated=data?.meta?.generated_at?new Date(data.meta.generated_at):null;
  const stamp=generated&&!Number.isNaN(generated.valueOf())?generated.toLocaleString('ru-RU',{timeZone:'Asia/Yekaterinburg',day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',','')+' ЕКБ':'';
  const periodCards=rows.map(r=>{
    const periodId=Number(r.reporting_period_id),expanded=!collapsed.has(periodId),periodName=cap(monthNames[Number(r.reporting_month)-1]||'')+' '+r.reporting_year;
    const sourceRows=Array.isArray(r.sources)?r.sources:[];
    const table=expanded?`<div class="employee-source-table"><div class="employee-source-head"><span>Статья начисления</span><span class="source-count">Состав</span><span class="source-amount">Сумма</span><span aria-hidden="true"></span></div>${sourceRows.map(s=>`<button type="button" class="employee-source-row" data-source-code="${esc(s.source_code)}" data-source-period="${periodId}"><span class="source-name">${esc(s.source_name)}</span><span class="source-count">${esc(recordCountLabel(s.item_count))}</span><span class="source-amount">${rub(s.accrual_total)}</span><svg class="chev" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7.5 4.8 5.2 5.2-5.2 5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>`).join('')}</div>`:'';
    return `<section class="employee-period-card"><button type="button" class="employee-period-card-head" data-toggle-period="${periodId}" aria-expanded="${expanded?'true':'false'}"><svg class="employee-period-calendar" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="17" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M2.5 9.5h19M7 2v5M17 2v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="7" cy="13" r="1" fill="currentColor"/><circle cx="12" cy="13" r="1" fill="currentColor"/><circle cx="17" cy="13" r="1" fill="currentColor"/><circle cx="7" cy="17" r="1" fill="currentColor"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg><span class="employee-period-name">${esc(periodName)}</span><span class="employee-period-total"><span class="employee-period-total-label">Итого за период</span><span class="employee-period-total-value">${rub(r.accrual_total)}</span></span><svg class="employee-period-chevron ${expanded?'open':''}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>${table}</section>`;
  }).join('');
  $('content').innerHTML=`<div class="employee-heading"><button type="button" class="employee-back" data-employee-back aria-label="Назад к списку сотрудников"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h1>${esc(name)}</h1><span class="employee-divider" aria-hidden="true"></span><div class="accrual-snapshot"><span class="snapshot-dot" aria-hidden="true"></span>Данные на ${esc(stamp)}</div></div>
    <div class="employee-summary"><div class="employee-summary-line"><span class="employee-summary-label">${state.employeeAllPeriods?'Всего начислено':'Итого за период'}</span><span class="employee-period-pill">${esc(employeePeriodText())}</span></div><div class="employee-summary-value">${rub(summaryTotal)}</div></div>
    <div class="employee-period-heading"><h2>Периоды</h2>${state.employeeAllPeriods?'':'<button type="button" class="employee-clear" data-clear-period><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16l-6.5 7v5l-3 2v-7L4 5zM16 17l5 5m0-5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Убрать все фильтры</button>'}</div>
    ${rows.length?periodCards:empty('Нет начислений за выбранный период')}
    <button type="button" class="employee-back-float" data-employee-back aria-label="Назад к списку сотрудников"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    ${filterSummary(false).replace('class="filter-summary"','class="filter-summary filter-dock"')}`;
  document.querySelectorAll('[data-employee-back]').forEach(b=>b.onclick=()=>history.back());
  const clearPeriod=document.querySelector('[data-clear-period]');
  if(clearPeriod)clearPeriod.onclick=()=>replace({...state,employeeAllPeriods:true});
  document.querySelectorAll('.filter-dock [data-ftab]').forEach(b=>b.onclick=()=>openFilter(b.dataset.ftab));
  document.querySelectorAll('[data-toggle-period]').forEach(b=>b.onclick=()=>{
    const periodId=Number(b.dataset.togglePeriod),next=new Set((state.collapsed_period_ids||[]).map(Number));
    if(next.has(periodId))next.delete(periodId);else next.add(periodId);
    replace({...state,collapsed_period_ids:[...next]});
  });
  document.querySelectorAll('[data-source-code]').forEach(b=>b.onclick=()=>push({...state,view:'source',reporting_period_id:Number(b.dataset.sourcePeriod),source_code:b.dataset.sourceCode}));
}
function renderAccrualSource(){
  const employee=accrualEmployeeById.get(Number(state.employee_id));
  const period=employee?.periods?.find(x=>Number(x.reporting_period_id)===Number(state.reporting_period_id));
  const source=period?.sources?.find(x=>String(x.source_code)===String(state.source_code));
  if(!employee||!period||!source){$('content').innerHTML=empty();return}
  const name=shortName(employee.fio_full||'Сотрудник');
  const generated=data?.meta?.generated_at?new Date(data.meta.generated_at):null;
  const stamp=generated&&!Number.isNaN(generated.valueOf())?generated.toLocaleString('ru-RU',{timeZone:'Asia/Yekaterinburg',day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',','')+' ЕКБ':'';
  const items=Array.isArray(source.items)?source.items:[];
  const calculationKind=String(source.calculation_kind||items[0]?.calculation_kind||'');
  const plainAmount=v=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v)||0);
  const decimal=v=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:2,useGrouping:false}).format(Number(v)||0);
  const fixed2=v=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false}).format(Number(v)||0);
  const signedAmount=v=>{const n=Number(v)||0;return (n>0?'+':n<0?'−':'')+plainAmount(Math.abs(n))};
  const commonHead=`<div class="employee-heading"><button type="button" class="employee-back" data-source-back aria-label="Назад"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h1>${esc(name)}</h1><span class="employee-divider" aria-hidden="true"></span><div class="accrual-snapshot"><span class="snapshot-dot" aria-hidden="true"></span>Данные на ${esc(stamp)}</div></div>
    <div class="employee-summary"><div class="employee-summary-line"><span class="employee-summary-label">${esc(source.source_name)}</span><span class="employee-period-pill">${cap(monthNames[Number(period.reporting_month)-1]||'')} ${period.reporting_year}</span></div><div class="employee-summary-value">${rub(source.accrual_total)}</div></div>`;
  let detailHtml='';
  let bindRepair=false;

  if(calculationKind==='work_order_ktu_percent'){
    const rowHtml=items.map(i=>{
      const documentLabel=i.work_order_id?'ЗН №'+esc(i.work_order_number||i.work_order_id):'Основание';
      const calc='<span class="calc-base '+(String(i.calculation_base_mode)==='manual'?'base-manual':'')+'">База '+esc(plainAmount(i.calculation_base_amount))+'</span> · КТУ '+esc(decimal(i.ktu))+' · '+esc(decimal(i.compensation_percent))+'%'+(num(i.accrual_adjustment)?' · '+esc(signedAmount(i.accrual_adjustment)):'');
      const drillable=num(i.repair_position_count)>0;
      const amountContent=`${rub(i.accrual_amount)}${drillable?'<svg class="register-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7.5 4.8 5.2 5.2-5.2 5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>':''}`;
      if(drillable)return `<button type="button" class="source-register-row drillable" data-source-item="${i.source_item_id}"><span class="register-document">${documentLabel}</span><span class="register-calc">${calc}</span><span class="register-amount">${amountContent}</span></button>`;
      return `<div class="source-register-row"><span class="register-document">${documentLabel}</span><span class="register-calc">${calc}</span><span class="register-amount">${amountContent}</span></div>`;
    }).join('');
    detailHtml=`<div class="source-register-heading"><h2>Реестр расчёта</h2><span class="source-register-count">${esc(recordCountLabel(source.item_count))}</span></div>
      ${rowHtml?`<div class="source-register"><div class="source-register-head"><span>Документ</span><span>Расчёт</span><span class="register-amount">Сумма</span></div>${rowHtml}</div>`:empty('Нет строк начисления')}`;
    bindRepair=true;
  }else if(calculationKind==='hours_rate'){
    const cards=items.map(i=>{
      const hours=fixed2(i.labor_hours);
      const rate=plainAmount(i.hourly_rate);
      const formula=hours+' × '+rate+' ₽/ч';
      return `<div class="calc-formula-card">
        <div class="calc-formula-row"><span class="calc-formula-label">Нормо-часы</span><strong class="calc-formula-value">${esc(hours)} ч</strong></div>
        <div class="calc-formula-row"><span class="calc-formula-label">Ставка</span><strong class="calc-formula-value">${esc(rate)} ₽/ч</strong></div>
        <div class="calc-formula-row expression"><span class="calc-formula-label">Расчёт</span><strong class="calc-formula-value">${esc(formula)}</strong></div>
        <div class="calc-formula-row total"><span class="calc-formula-label">Начислено</span><strong class="calc-formula-value">${rub(i.accrual_amount)}</strong></div>
      </div>`;
    }).join('');
    detailHtml=`<div class="source-register-heading"><h2>Расчёт начисления</h2></div><div class="calc-formula-stack">${cards||empty('Нет данных расчёта')}</div>`;
  }else if(calculationKind==='revenue_percent'){
    const cards=items.map(i=>{
      const output=rub(i.output_amount??i.calculation_base_amount);
      const percent=decimal(i.compensation_percent)+'%';
      const formula=output+' × '+percent;
      return `<div class="calc-formula-card">
        <div class="calc-formula-row"><span class="calc-formula-label">Выработка</span><strong class="calc-formula-value">${output}</strong></div>
        <div class="calc-formula-row"><span class="calc-formula-label">Процент</span><strong class="calc-formula-value">${esc(percent)}</strong></div>
        <div class="calc-formula-row expression"><span class="calc-formula-label">Расчёт</span><strong class="calc-formula-value">${esc(formula)}</strong></div>
        <div class="calc-formula-row total"><span class="calc-formula-label">Начислено</span><strong class="calc-formula-value">${rub(i.accrual_amount)}</strong></div>
      </div>`;
    }).join('');
    detailHtml=`<div class="source-register-heading"><h2>Расчёт начисления</h2></div><div class="calc-formula-stack">${cards||empty('Нет данных расчёта')}</div>`;
  }else{
    const cards=items.map(i=>`<div class="calc-formula-card"><div class="calc-formula-row total"><span class="calc-formula-label">Начислено</span><strong class="calc-formula-value">${rub(i.accrual_amount)}</strong></div></div>`).join('');
    detailHtml=`<div class="source-register-heading"><h2>Расчёт начисления</h2></div><div class="calc-formula-stack">${cards||empty('Нет данных расчёта')}</div>`;
  }

  $('content').innerHTML=commonHead+detailHtml+`<button type="button" class="source-back-float" data-source-back aria-label="Назад"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  document.querySelectorAll('[data-source-back]').forEach(b=>b.onclick=()=>history.back());
  if(bindRepair)document.querySelectorAll('[data-source-item]').forEach(b=>b.onclick=()=>push({...state,view:'repair_positions',source_item_id:Number(b.dataset.sourceItem)}));
}
function renderAccrualRepairPositions(){
  const employee=accrualEmployeeById.get(Number(state.employee_id));
  const period=employee?.periods?.find(x=>Number(x.reporting_period_id)===Number(state.reporting_period_id));
  const source=period?.sources?.find(x=>String(x.source_code)===String(state.source_code));
  const item=source?.items?.find(x=>Number(x.source_item_id)===Number(state.source_item_id));
  if(!employee||!period||!source||!item){$('content').innerHTML=empty();return}
  const positions=Array.isArray(item.repair_positions)?item.repair_positions:[];
  const name=shortName(employee.fio_full||'Сотрудник');
  const generated=data?.meta?.generated_at?new Date(data.meta.generated_at):null;
  const stamp=generated&&!Number.isNaN(generated.valueOf())?generated.toLocaleString('ru-RU',{timeZone:'Asia/Yekaterinburg',day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',','')+' ЕКБ':'';
  const plainAmount=v=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v)||0);
  const decimal=v=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:2,useGrouping:false}).format(Number(v)||0);
  const rows=positions.map(p=>{
    const calc=decimal(p.quantity)+' × '+plainAmount(p.unit_price)+(num(p.discount_percent)?' · скидка '+decimal(p.discount_percent)+'%':'');
    return `<div class="source-register-row"><span class="register-document">${esc(p.repair_name||('Работа #'+p.repair_item_id))}</span><span class="register-calc">${esc(calc)}</span><span class="register-amount">${rub(p.final_amount)}</span></div>`;
  }).join('');
  const workOrderLabel=item.work_order_id?'ЗН №'+esc(item.work_order_number||item.work_order_id):'Основание';
  const repairBaseClass=String(item.calculation_base_mode)==='manual'?'repair-base-note base-manual':'repair-base-note';
  $('content').innerHTML=`<div class="employee-heading"><button type="button" class="employee-back" data-repair-back aria-label="Назад"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h1>${esc(name)}</h1><span class="employee-divider" aria-hidden="true"></span><div class="accrual-snapshot"><span class="snapshot-dot" aria-hidden="true"></span>Данные на ${esc(stamp)}</div></div>
    <div class="employee-summary"><div class="employee-summary-line"><span class="employee-summary-label">${workOrderLabel} · Работы ЗН</span><span class="employee-period-pill">${cap(monthNames[Number(period.reporting_month)-1]||'')} ${period.reporting_year}</span></div><div class="employee-summary-value">${rub(item.repair_final_amount)}</div></div>
    <div class="${repairBaseClass}"><span>База КТУ</span><strong>${rub(item.calculation_base_amount)}</strong></div>
    <div class="source-register-heading"><h2>Позиции работ</h2><span class="source-register-count">${esc(recordCountLabel(item.repair_position_count))}</span></div>
    ${num(item.repair_position_count)>0?`<div class="source-register repair-position-register"><div class="source-register-head"><span>Работа</span><span>Расчёт</span><span class="register-amount">Итог</span></div>${rows}</div>`:empty('Нет позиций работ')}
    <button type="button" class="source-back-float" data-repair-back aria-label="Назад"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  document.querySelectorAll('[data-repair-back]').forEach(b=>b.onclick=()=>history.back());
}
function paymentFiltersPanel(){
  const statusButtons=[
    {code:'paid',label:'Выплачено'},
    {code:'draft',label:'Черновик'}
  ].map(f=>'<button type="button" class="payment-status-btn status-'+f.code+' '+(state.payment_status_filter===f.code?'active':'')+'" data-payment-status="'+f.code+'">'+paymentIcon(f.code)+'<span>'+f.label+'</span></button>').join('');
  const typeButtons=paymentTypeOptions().map(f=>'<button type="button" class="payment-type-btn type-'+esc(f.code)+' '+(state.payment_type_filter===f.code?'active':'')+'" data-payment-type="'+esc(f.code)+'">'+paymentIcon('source',f.code)+'<span>'+esc(f.label)+'</span></button>').join('');
  return '<div class="payment-filter-panel"><div><div class="payment-filter-group-title">Статус</div><div class="payment-status-buttons">'+statusButtons+'</div></div><div class="payment-filter-divider" aria-hidden="true"></div><div><div class="payment-filter-group-title">Тип</div><div class="payment-type-buttons">'+typeButtons+'</div></div></div>';
}
function paymentSummaryCards(summary){
  const s=summary||{};
  return '<div class="payment-summary-grid"><div class="payment-summary-card paid"><div class="payment-summary-line"><span class="payment-summary-icon">'+paymentIcon('paid')+'</span><span class="payment-summary-title">Выплачено</span><span class="payment-summary-divider"></span><span class="payment-summary-count">'+esc(paymentPaidCountLabel(s.paid_count))+'</span></div><div class="payment-summary-value">'+rub(s.paid_total)+'</div></div><div class="payment-summary-card draft"><div class="payment-summary-line"><span class="payment-summary-icon">'+paymentIcon('draft')+'</span><span class="payment-summary-title">Черновик</span><span class="payment-summary-divider"></span><span class="payment-summary-count">'+esc(draftRecordCountLabel(s.draft_count))+'</span></div><div class="payment-summary-value">'+rub(s.draft_total)+'</div></div></div>';
}
function paymentRowGeneral(p){
  const person=staffById.get(Number(p.staff_member_id)),src=sourceById.get(Number(p.payment_source_id)),sourceCode=src?.code||'';
  return '<button type="button" class="payment-register-row general '+(p.status==='draft'?'draft':'paid')+'" data-payemp="'+p.staff_member_id+'"><span class="pay-person">'+esc(shortName(person?.fio_full||('Сотрудник #'+p.staff_member_id)))+'</span><span class="pay-date">'+esc(paymentDateText(p.payment_date))+'</span><span class="pay-type source-'+esc(sourceCode)+'" aria-label="'+esc(src?.name||'')+'">'+paymentIcon('source',sourceCode)+'</span><span class="pay-amount">'+rub(p.amount)+'</span><span class="pay-status" aria-label="'+(p.status==='paid'?'Выплачено':'Черновик')+'">'+paymentStatusIcon(p.status)+'</span><svg class="pay-chev" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7.5 4.8 5.2 5.2-5.2 5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>';
}
function paymentRowEmployee(p){
  const src=sourceById.get(Number(p.payment_source_id)),sourceCode=src?.code||'';
  return '<button type="button" class="payment-register-row employee '+(p.status==='draft'?'draft':'paid')+'" data-pay="'+p.id+'"><span class="pay-date">'+esc(paymentDateText(p.payment_date))+'</span><span class="pay-type source-'+esc(sourceCode)+'" aria-label="'+esc(src?.name||'')+'">'+paymentIcon('source',sourceCode)+'</span><span class="pay-amount">'+rub(p.amount)+'</span><span class="pay-status" aria-label="'+(p.status==='paid'?'Выплачено':'Черновик')+'">'+paymentStatusIcon(p.status)+'</span><svg class="pay-chev" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7.5 4.8 5.2 5.2-5.2 5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>';
}
function bindPaymentCommon(){
  document.querySelectorAll('[data-payment-status]').forEach(b=>b.onclick=()=>{
    const code=b.dataset.paymentStatus;
    replace({...state,payment_status_filter:state.payment_status_filter===code?null:code});
  });
  document.querySelectorAll('[data-payment-type]').forEach(b=>b.onclick=()=>{
    const code=b.dataset.paymentType;
    replace({...state,payment_type_filter:state.payment_type_filter===code?null:code});
  });
  document.querySelectorAll('.filter-dock [data-ftab]').forEach(b=>b.onclick=()=>openFilter(b.dataset.ftab));
}
function renderPayments(){
  const rows=paymentRowsFiltered(),summary=paymentSummary(),stamp=paymentStamp();
  $('content').innerHTML='<div class="payment-sticky"><div class="payment-heading"><button type="button" class="payment-back" data-payments-back aria-label="Назад"><svg viewBox="0 0 24 24" fill="none"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h1>Выплаты</h1><div class="payment-snapshot"><span class="payment-snapshot-dot"></span>Данные на '+esc(stamp)+'</div></div>'+paymentAggregateChip()+paymentSummaryCards(summary)+'</div>'+paymentFiltersPanel()+'<div class="payment-register-heading"><h2>Реестр выплат</h2><span>'+esc(recordCountLabel(paymentModel?.summary?.total_count??rows.length))+'</span></div>'+(rows.length?'<div class="payment-register"><div class="payment-register-head general"><span>Сотрудник</span><span>Дата</span><span>Тип</span><span style="text-align:right">Сумма</span><span>Статус</span><span></span></div>'+rows.map(paymentRowGeneral).join('')+'</div>':'<div class="payment-empty">Нет выплат для выбранных фильтров</div>')+filterSummary(false).replace('class="filter-summary"','class="filter-summary filter-dock"');
  document.querySelector('[data-payments-back]')?.addEventListener('click',()=>history.back());
  document.querySelectorAll('[data-payemp]').forEach(b=>b.onclick=()=>push({...state,view:'payment_employee',employee_id:Number(b.dataset.payemp),payment_id:null}));
  bindPaymentCommon();
}
function renderPaymentEmployee(){
  const rows=paymentRowsFiltered(state.employee_id),summary=paymentSummary(state.employee_id),stamp=paymentStamp();
  const person=staffById.get(Number(state.employee_id)),name=shortName(person?.fio_full||('Сотрудник #'+state.employee_id));
  $('content').innerHTML='<div class="payment-sticky"><div class="payment-heading employee"><button type="button" class="payment-back" data-payment-employee-back aria-label="Назад"><svg viewBox="0 0 24 24" fill="none"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h1>'+esc(name)+'</h1><span class="payment-divider"></span><div class="payment-snapshot"><span class="payment-snapshot-dot"></span>Данные на '+esc(stamp)+'</div></div>'+paymentAggregateChip()+paymentSummaryCards(summary)+'</div>'+paymentFiltersPanel()+'<div class="payment-register-heading"><h2>Реестр выплат</h2><span>'+esc(recordCountLabel(paymentModel?.summary?.total_count??rows.length))+'</span></div>'+(rows.length?'<div class="payment-register"><div class="payment-register-head employee"><span>Дата</span><span>Тип</span><span style="text-align:right">Сумма</span><span>Статус</span><span></span></div>'+rows.map(paymentRowEmployee).join('')+'</div>':'<div class="payment-empty">Нет выплат сотрудника для выбранных фильтров</div>')+'<button type="button" class="payment-back-float" data-payment-employee-back aria-label="Назад"><svg viewBox="0 0 24 24" fill="none"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+filterSummary(false).replace('class="filter-summary"','class="filter-summary filter-dock"');
  document.querySelectorAll('[data-payment-employee-back]').forEach(b=>b.onclick=()=>history.back());
  document.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>push({...state,view:'payment',payment_id:Number(b.dataset.pay)}));
  bindPaymentCommon();
}
function renderPaymentDetail(){const p=payments.find(x=>Number(x.id)===Number(state.payment_id));if(!p){$('content').innerHTML=empty();return}const person=staffById.get(Number(p.staff_member_id)),src=sourceById.get(Number(p.payment_source_id));$('content').innerHTML=`<div class="detail-head"><div><h1>${esc(shortName(person?.fio_full||('Сотрудник #'+p.staff_member_id)))}</h1><p>Выплата #${p.id}</p></div><div class="detail-total">${rub(p.amount)}</div></div><div class="detail-grid"><div class="detail-box"><span>Расчётный месяц</span><b>${periodLabel(p.reporting_period_id,true)}</b></div><div class="detail-box"><span>Дата выплаты</span><b>${new Date(p.payment_date+'T00:00:00').toLocaleDateString('ru-RU')}</b></div><div class="detail-box"><span>Источник</span><b>${esc(src?.name||'—')}</b></div><div class="detail-box"><span>Статус</span><b class="${p.status==='paid'?'positive':''}">${p.status==='paid'?'Выплачено':'Черновик'}</b></div></div>${p.comment?`<div class="note">${esc(p.comment)}</div>`:''}`}
function balanceSelection(){
  const selected=periods.filter(p=>monthKey(p.year,p.month)>=state.rangeStart&&monthKey(p.year,p.month)<=state.rangeEnd)
    .sort((a,b)=>(a.year-b.year)||(a.month-b.month));
  const latest=selected.at(-1);
  const records=(statementModel?.items||[]).map(r=>({
    ...r,
    flow:{accrual:num(r.accrual_total),payment:num(r.payment_total)}
  }));
  const flows=new Map(records.map(r=>[
    Number(r.staff_member_id),
    {accrual:num(r.accrual_total),payment:num(r.payment_total)}
  ]));
  return {
    selected,
    latest,
    rows:balances,
    records,
    summary:statementModel?.summary||null,
    flows
  };
}
function balanceStateClass(v){return ['to_pay','overpaid','settled'].includes(v)?v:'settled'}
function balanceBindFilter(){
  document.querySelector('[data-open-range]')?.addEventListener('click',()=>openFilter('month'));
  document.querySelectorAll('.filter-dock [data-ftab]').forEach(b=>b.onclick=()=>openFilter(b.dataset.ftab));
}
let balanceListScroll=null;
function openBalanceEmployee(id){
  const root=document.scrollingElement||document.documentElement;
  balanceListScroll={depth:state.depth,top:root?.scrollTop??window.scrollY,contentTop:$('content').scrollTop,restoration:history.scrollRestoration};
  if('scrollRestoration' in history)history.scrollRestoration='manual';
  push({...state,view:'employee_balance',employee_id:id});
  setAccrualScroll(0);
  requestAnimationFrame(()=>{if(state.section==='balance'&&state.view==='employee_balance')setAccrualScroll(0)});
}
function renderBalance(){
  if(Number(data.version)<8){$('content').innerHTML=empty('Для ведомости требуется обновлённый payload');return}
  const model=balanceSelection();
  const paid=num(statementModel?.flow?.payment_total);
  const paymentCount=num(statementModel?.flow?.payment_count);
  const payable=model.summary?.payable_total, payableCount=model.summary?.payable_employee_count;
  const rows=model.records.map(r=>{
    const id=Number(r.staff_member_id),name=shortName(staffById.get(id)?.fio_full||r.fio_full);
    return '<button type="button" class="balance-register-grid balance-register-row" data-balemp="'+id+'" aria-label="'+esc(name)+'. Начислено '+esc(rub(r.flow.accrual))+', выплачено '+esc(rub(r.flow.payment))+', остаток '+esc(rub(r.closing_balance))+'"><span class="balance-person"><span class="balance-name">'+esc(name)+'</span><span class="balance-accrual">'+rubNumber(r.flow.accrual)+'</span></span><span class="balance-paid">'+rubNumber(r.flow.payment)+'</span><span class="balance-end '+balanceStateClass(r.settlement_state)+'">'+rubNumber(r.closing_balance)+'</span><svg class="chev" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7.5 4.8 5.2 5.2-5.2 5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>';
  }).join('');
  $('content').innerHTML='<div class="balance-summary-grid"><div class="balance-summary-card"><div class="balance-summary-head"><span>Выплачено</span><span class="balance-summary-badge">'+paymentCount+'</span></div><div class="balance-summary-value">'+rub(paid)+'</div></div>'
    +'<div class="balance-summary-card payable"><div class="balance-summary-head"><span>К выплате</span><span class="balance-summary-badge">'+(payableCount??0)+'</span></div><div class="balance-summary-value">'+(payable==null?'—':rub(payable))+'</div></div></div>'
    +'<div class="balance-register-sticky"><div class="balance-register-heading"><h2>Ведомость</h2><span class="balance-record-count">'+esc(recordCountLabel(statementModel?.page?.total_count??model.records.length))+'</span>'+rangeChip()+'</div>'
    +'<div class="balance-register-grid balance-register-head"><span>Начислено, руб.</span><span>Выплачено, руб.</span><span>К выплате, руб.</span><span></span></div></div>'
    +(model.records.length?'<div class="balance-register">'+rows+'</div>':empty('Нет данных за выбранный период'))
    +filterSummary(false).replace('class="filter-summary"','class="filter-summary filter-dock"');
  document.querySelectorAll('[data-balemp]').forEach(b=>b.onclick=()=>openBalanceEmployee(Number(b.dataset.balemp)));
  balanceBindFilter();
}
function balanceOpeningLabel(value){return num(value)>0?'Долг с прошлого месяца':num(value)<0?'Переплата с прошлого месяца':'Остаток с прошлого месяца'}
function balancePeriodRow(r){
  const status=balanceStateClass(r.settlement_state);
  return '<button class="balance-period-row balance-ledger-period" type="button" data-balmonth="'+r.reporting_period_id+'">'
    +'<span class="ledger-title"><strong>'+esc(periodLabel(r.reporting_period_id,true))+'</strong><svg class="chev" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7.5 4.8 5.2 5.2-5.2 5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span>'
    +'<span class="ledger-formula"><span class="ledger-label">'+balanceOpeningLabel(r.opening_balance)+'</span><span class="ledger-value">'+rub(r.opening_balance)+'</span>'
    +'<span class="ledger-label">+ Начислено</span><span class="ledger-value">'+rub(r.accrual_total)+'</span>'
    +'<span class="ledger-label">− Выплачено</span><span class="ledger-value">'+rub(r.payment_total)+'</span>'
    +'<span class="ledger-label ledger-delta">Изменение за месяц</span><span class="ledger-value ledger-delta">'+rub(r.month_delta)+'</span>'
    +'<span class="ledger-label ledger-final">Остаток на конец месяца</span><span class="ledger-value ledger-final '+status+'">'+rub(r.closing_balance)+'</span></span></button>';
}
function renderBalanceEmployee(){
  const model=balanceSelection(),id=Number(state.employee_id),latest=model.latest?balances.find(r=>Number(r.reporting_period_id)===Number(model.latest.id)&&Number(r.staff_member_id)===id):null;
  const name=shortName(staffById.get(id)?.fio_full||latest?.fio_full||'Сотрудник');
  const flow=model.flows.get(id)||{accrual:0,payment:0};
  const historyRows=model.rows.filter(r=>Number(r.staff_member_id)===id)
    .sort((a,b)=>(b.reporting_year-a.reporting_year)||(b.reporting_month-a.reporting_month));
  $('content').innerHTML='<div class="balance-detail-head"><button class="balance-back" type="button" data-balance-back aria-label="Назад"><svg viewBox="0 0 24 24" fill="none"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h1>'+esc(name)+'</h1></div>'
    +'<div class="balance-period">'+rangeChip()+'</div>'
    +'<div class="balance-detail-grid"><div class="balance-summary-card"><div class="balance-summary-head">Начислено</div><div class="balance-summary-value">'+rub(flow.accrual)+'</div></div><div class="balance-summary-card"><div class="balance-summary-head">Выплачено</div><div class="balance-summary-value">'+rub(flow.payment)+'</div></div><div class="balance-summary-card payable"><div class="balance-summary-head">Остаток</div><div class="balance-summary-value '+(latest?balanceStateClass(latest.settlement_state):'')+'">'+(latest?rub(latest.closing_balance):'—')+'</div></div></div>'
    +'<div class="balance-register-heading"><h2>Периоды</h2><span>'+esc(recordCountLabel(historyRows.length))+'</span></div>'
    +(historyRows.length?'<div class="balance-register">'+historyRows.map(balancePeriodRow).join('')+'</div>':empty('Нет периодов в выбранном диапазоне'))
    +filterSummary(false).replace('class="filter-summary"','class="filter-summary filter-dock"');
  document.querySelector('[data-balance-back]')?.addEventListener('click',()=>history.back());
  document.querySelectorAll('[data-balmonth]').forEach(b=>b.onclick=()=>push({...state,view:'balance_month',reporting_period_id:Number(b.dataset.balmonth)}));
  balanceBindFilter();
}
function renderBalanceMonth(){
  const r=balances.find(x=>Number(x.staff_member_id)===Number(state.employee_id)&&Number(x.reporting_period_id)===Number(state.reporting_period_id));
  if(!r){$('content').innerHTML=empty('Нет расчёта за выбранный месяц');return}
  const name=shortName(staffById.get(Number(state.employee_id))?.fio_full||r.fio_full);
  const linked=payments.filter(p=>Number(p.staff_member_id)===Number(state.employee_id)&&Number(p.reporting_period_id)===Number(state.reporting_period_id)&&p.status==='paid');
  $('content').innerHTML='<div class="balance-detail-head"><button class="balance-back" type="button" data-balance-back aria-label="Назад"><svg viewBox="0 0 24 24" fill="none"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h1>'+esc(name)+'</h1></div>'
    +'<div class="balance-period"><span class="payment-period-pill">'+calendarIcon(false)+'<span>'+esc(periodLabel(r.reporting_period_id,true))+'</span></span></div>'
    +'<div class="balance-month-grid"><div class="detail-box"><span>Входящий остаток</span><b>'+rub(r.opening_balance)+'</b></div><div class="detail-box"><span>Начислено</span><b>'+rub(r.accrual_total)+'</b></div><div class="detail-box"><span>Выплачено</span><b>'+rub(r.payment_total)+'</b></div><div class="detail-box"><span>Дельта месяца</span><b>'+rub(r.month_delta)+'</b></div><div class="detail-box outgoing"><span>Исходящий остаток</span><b class="'+signClass(r.closing_balance)+'">'+rub(r.closing_balance)+'</b></div></div>'
    +'<div class="balance-register-heading"><h2>Выплаты месяца</h2><span>'+esc(recordCountLabel(linked.length))+'</span></div>'
    +(linked.length?'<div class="balance-register">'+linked.map(p=>'<button class="balance-period-row" type="button" data-linkedpay="'+p.id+'"><span class="period-main"><strong>'+esc(paymentDateText(p.payment_date))+'</strong><small>'+esc(sourceById.get(Number(p.payment_source_id))?.name||'—')+'</small></span><span class="balance-end">'+rub(p.amount)+'</span><svg class="chev" viewBox="0 0 20 20" fill="none"><path d="m7.5 4.8 5.2 5.2-5.2 5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>').join('')+'</div>':empty('Оплаченных выплат за этот расчётный месяц нет'))
    +filterSummary(false).replace('class="filter-summary"','class="filter-summary filter-dock"');
  document.querySelector('[data-balance-back]')?.addEventListener('click',()=>history.back());
  document.querySelectorAll('[data-linkedpay]').forEach(b=>b.onclick=()=>push({...state,section:'payments',view:'payment',payment_id:Number(b.dataset.linkedpay)}));
  balanceBindFilter();
}
function renderSummary(){const ids=new Set(selectedIds()),rows=summaries.filter(r=>ids.has(Number(r.reporting_period_id))).sort((a,b)=>(a.reporting_year-b.reporting_year)||(a.reporting_month-b.reporting_month)),latest=rows.at(-1),flowAcc=rows.reduce((s,r)=>s+num(r.accrual_total),0),flowPay=rows.reduce((s,r)=>s+num(r.payment_total),0);$('content').innerHTML=hero('Общий баланс к выплате',`<span class="${signClass(latest?.balance_to_pay)}">${rub(latest?.balance_to_pay)}</span>`,rows.length?periodLabel(latest.reporting_period_id):'—','последний выбранный месяц',[['Начислено',rub(flowAcc)],['Выплачено',rub(flowPay)],['Месяцев',String(rows.length)]])+`<div class="section-title"><h2>По месяцам</h2><span>канонический summary</span></div>`+(rows.length?`<div class="list">${rows.map(r=>`<button class="summary-card item" data-summary="${r.reporting_period_id}"><div class="summary-head"><div class="summary-month">${periodLabel(r.reporting_period_id,true)}</div><div class="summary-balance ${signClass(r.balance_to_pay)}">${rub(r.balance_to_pay)}</div></div><div class="summary-grid"><div class="summary-cell"><span>Начислено</span><b>${rub(r.accrual_total)}</b></div><div class="summary-cell"><span>Выплачено</span><b>${rub(r.payment_total)}</b></div><div class="summary-cell"><span>Входящий</span><b class="${signClass(r.opening_balance)}">${rub(r.opening_balance)}</b></div><div class="summary-cell"><span>Дельта месяца</span><b class="${signClass(r.month_delta)}">${rub(r.month_delta)}</b></div></div></button>`).join('')}</div>`:empty());document.querySelectorAll('[data-summary]').forEach(b=>b.onclick=()=>push({...state,view:'summary_month',reporting_period_id:Number(b.dataset.summary)}))}
function renderSummaryMonth(){const r=summaries.find(x=>Number(x.reporting_period_id)===Number(state.reporting_period_id));if(!r){$('content').innerHTML=empty();return}$('content').innerHTML=`<div class="detail-head"><div><h1>${periodLabel(r.reporting_period_id,true)}</h1><p>Общий баланс Staff Cost</p></div><div class="detail-total ${signClass(r.balance_to_pay)}">${rub(r.balance_to_pay)}</div></div><div class="detail-grid"><div class="detail-box"><span>Входящий баланс</span><b class="${signClass(r.opening_balance)}">${rub(r.opening_balance)}</b></div><div class="detail-box"><span>Начислено</span><b>${rub(r.accrual_total)}</b></div><div class="detail-box"><span>Выплачено</span><b>${rub(r.payment_total)}</b></div><div class="detail-box"><span>Дельта месяца</span><b class="${signClass(r.month_delta)}">${rub(r.month_delta)}</b></div></div><div class="source-row"><div class="source-name">Итоговый баланс</div><div class="source-val ${signClass(r.closing_balance)}">${rub(r.closing_balance)}</div></div>`}
function renderBody(){if(state.section==='accruals'){if(renderRegisteredAccrualScreen(state.view,{mechanical_service_advisor_accruals:()=>renderMechanicalServiceAdvisorAccruals({$,employees:accrualEmployees,periodIds:accrualIds(),state,bodyRepairHeader,rub,esc,shortName,empty,filterSummary,openFilter,replace,bodyEmployeeIcon,bodyChevron,periodById,monthNames,cap}),mechanical_repair_accruals:()=>renderMechanicalRepairAccruals({$,mechanicalAccrualModel,state,periodById,monthNames,cap,esc,mechanicalHours,rub,bodyEmployeeIcon,shortName,recordCountLabel,bodyChevron,bodyRepairHeader,num,empty,filterSummary,openFilter,replace,data,bodyRepairEmployeeGroups,currentAccrualAggregate,bodyRepairVisibleWorkOrderCount,workOrderCountLabel,bodyRepairWorkOrderCard,bodyWorkOrderChevron,openBodyRepairWorkOrders}),body_repair_accruals:()=>renderBodyRepairAccruals({$,mechanicalAccrualModel,state,periodById,monthNames,cap,esc,mechanicalHours,rub,bodyEmployeeIcon,shortName,recordCountLabel,bodyChevron,bodyRepairHeader,num,empty,filterSummary,openFilter,replace,data,bodyRepairEmployeeGroups,currentAccrualAggregate,bodyRepairVisibleWorkOrderCount,workOrderCountLabel,bodyRepairWorkOrderCard,bodyWorkOrderChevron,openBodyRepairWorkOrders})}))return;if(state.view==='body_repair_work_orders')return renderBodyRepairWorkOrders();if(state.view==='billing_payments')return renderBillingPayments();if(state.view==='employee')return renderAccrualEmployee();if(state.view==='source')return renderAccrualSource();if(state.view==='repair_positions')return renderAccrualRepairPositions();return renderAccruals()}if(state.section==='payments'){if(state.view==='payment_employee')return renderPaymentEmployee();if(state.view==='payment')return renderPaymentDetail();return renderPayments()}if(state.section==='balance'){if(state.view==='employee_balance')return renderBalanceEmployee();if(state.view==='balance_month')return renderBalanceMonth();return renderBalance()}if(state.section==='summary'){if(state.view==='summary_month')return renderSummaryMonth();return renderSummary()}state.section='accruals';state.view='list';renderAccruals()}
let renderEpoch=0;
async function render(){
  const token=++renderEpoch;
  window.dispatchEvent(new CustomEvent("staff-cost:view-state",{detail:{root:state.section==='accruals'&&state.view==='list'}}));
  continuationObserver?.disconnect();
  continuationObserver=null;
  syncTelegramBackButton();
  renderChrome();
  renderFilter();
  try{
    await ensureViewData();
  }catch(error){
    console.error('staff_cost_view_load_failed',{
      section:state.section,
      view:state.view,
      message:error instanceof Error?error.message:String(error)
    });
    if(token===renderEpoch)$('content').innerHTML=empty('Не удалось загрузить данные');
    return;
  }
  if(token!==renderEpoch)return;
  renderChrome();
  renderBody();
  renderFilter();
  installCurrentContinuation();
  queueMicrotask(prefetchPrimaryViews);
}
window.addEventListener('popstate',async e=>{
  if(!e.state?.staffCost)return;
  state={...initial,...e.state};
  syncTelegramBackButton();
  await render();
  if(accrualListScroll&&state.section==='accruals'&&state.view==='list'&&state.depth===accrualListScroll.depth){
    const saved=accrualListScroll;
    requestAnimationFrame(()=>{
      if(state.section==='accruals'&&state.view==='list'&&state.depth===saved.depth){
        setAccrualScroll(saved.top,saved.contentTop);
        if('scrollRestoration' in history)history.scrollRestoration=saved.restoration;
        accrualListScroll=null;
      }
    });
  }else if(accrualListScroll&&state.section==='accruals'&&state.view==='employee'){
    setAccrualScroll(0);
    requestAnimationFrame(()=>{if(state.section==='accruals'&&state.view==='employee')setAccrualScroll(0)});
  }
  if(balanceListScroll&&state.section==='balance'&&state.view==='list'&&state.depth===balanceListScroll.depth){
    const saved=balanceListScroll;
    requestAnimationFrame(()=>{
      if(state.section==='balance'&&state.view==='list'&&state.depth===saved.depth){
        setAccrualScroll(saved.top,saved.contentTop);
        if('scrollRestoration' in history)history.scrollRestoration=saved.restoration;
        balanceListScroll=null;
      }
    });
  }else if(balanceListScroll&&state.section==='balance'&&state.view==='employee_balance'){
    setAccrualScroll(0);
    requestAnimationFrame(()=>{if(state.section==='balance'&&state.view==='employee_balance')setAccrualScroll(0)});
  }
});
history.replaceState({staffCost:true,...state},'');
syncTelegramBackButton();
window.StaffCostDashboard={getState:()=>({...state}),render,back:()=>history.back()};
await render();
document.body.classList.remove('app-boot');
}
