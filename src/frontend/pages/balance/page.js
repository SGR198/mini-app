import { balanceApi } from "./api.js";
import { dashboardStyle } from "./dashboard-style.js";

// Faithful port of dashboard.registry balance/template.html.
// The source markup and source-detail renderers below are retained from the original.
const host=()=>document.getElementById("balance-workspace");
const staff=()=>document.getElementById("staff-cost-workspace");
const monthNames=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const num=v=>Number(v)||0;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(num(v))+' ₽';
const day=v=>{if(!v)return'—';const d=new Date(String(v).slice(0,10)+'T00:00:00');return Number.isNaN(d.valueOf())?esc(v):d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit'})};
const periodName=p=>p?monthNames[Number(p.month)-1]+' '+p.year:'—';
const balanceClass=v=>num(v)>0?'overdue':num(v)<0?'credit':'zero';
const sum=(rows,key)=>rows.reduce((a,r)=>a+num(r[key]),0);
const empty=msg=>`<div class="empty">${esc(msg)}</div>`;
const sourceConfig={
  salary:{title:'ЗП',heading:'Зарплатные затраты',field:'salary_cost_rub'},
  purchase:{title:'Закуп',heading:'Закупки',field:'purchase_cost_rub'},
  body:{title:'Кузов',heading:'Кузов',field:'body_cost_rub'},
  rental:{title:'Прокат',heading:'Прокат',field:'rental_cost_rub'},
  repayment:{title:'Погашения',heading:'Погашения',field:'repaid_amount_rub'}
};
const periodById=new Map();
const employees=new Map();
let periods=[],active=false,seq=0,currentId=null,currentSource=null,rows=[],totalCount=0,offset=0,initialized=false;
let root=null,month=null;
const monthCache=new Map();
const sourceCache=new Map();
const CACHE_TTL_MS=60_000;
let rootLoadedAt=0;
const cached=(entry)=>entry&&Date.now()-entry.at<CACHE_TTL_MS?entry.data:null;
const $=id=>root?.getElementById(id);
const pathMonth=id=>'/balance/month/'+id;
const pathSource=(id,code)=>pathMonth(id)+'/source/'+code;
const route=()=>{const p=location.pathname.split('/').filter(Boolean);if(p[0]!=='balance')return {id:null,source:null};const id=p[1]==='month'&&/^[0-9]+$/.test(p[2]||'')?Number(p[2]):null;return {id,source:p[3]==='source'&&sourceConfig[p[4]]?p[4]:null};};
const monthFact=()=>monthCache.get(currentId)?.data||periods.find(p=>Number(p.reporting_period_id)===currentId);
const rangeLabel=()=>periodName(monthFact());
function setup(){
 if(initialized)return;
 initialized=true;
 root=host().attachShadow({mode:'open'});
 root.innerHTML=`<style>${dashboardStyle}</style><div class="app"><main class="shell"><header class="header"><div class="header-row"><button id="backBtn" class="header-back" type="button" aria-label="Назад"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 4-8 8 8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div id="headerTitle" class="header-title">Баланс</div><div id="snapshot" class="snapshot"><span class="snapshot-dot" aria-hidden="true"></span><span id="snapshotText">Данные</span></div></div></header><section id="content" class="content"></section></main></div>`;
 root.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   if(b.id==='backBtn'){back();return;}
   if(b.hasAttribute('data-root-period-id')){navigate(Number(b.dataset.rootPeriodId));return;}
   if(b.hasAttribute('data-source')){navigate(currentId,b.dataset.source);return;}
   if(b.hasAttribute('data-repayments')){navigate(currentId,'repayment');return;}
   if(b.hasAttribute('data-more')){void loadSource(currentId,currentSource,true);return;}
   if(b.hasAttribute('data-retry')){void loadRoute();return;}
 });
 window.addEventListener('popstate',()=>{if(active)void loadRoute();});
 globalThis.Telegram?.WebApp?.BackButton?.onClick?.(back);
}
function notify(){
 window.dispatchEvent(new CustomEvent('balance:view-state',{detail:{root:!currentId}}));
 const btn=globalThis.Telegram?.WebApp?.BackButton;
 if(active&&currentId)btn?.show?.();else btn?.hide?.();
}
function header(title){
 $('headerTitle').textContent=title;
 $('backBtn').classList.toggle('show',!!currentId);
 $('snapshotText').textContent='Данные из базы';
 notify();
}
function navigate(id,source=null){
 history.pushState({...history.state,balanceMonth:id,balanceSource:source},'',source?pathSource(id,source):pathMonth(id));
 void loadRoute();
}
function back(){
 if(!active||!currentId)return;
 if(currentSource){history.replaceState({...history.state,balanceSource:null},'',pathMonth(currentId));void loadRoute();return;}
 history.replaceState({...history.state,balanceMonth:null},'','/balance');void loadRoute();
}
function renderRoot(){
 currentId=null;currentSource=null;header('Баланс');
 const sorted=[...periods].sort((a,b)=>Number(b.year)-Number(a.year)||Number(b.month)-Number(a.month));
 const periodHtml=sorted.length?sorted.map(p=>`<button type="button" class="period-row" data-root-period-id="${p.reporting_period_id}"><div class="period-top"><span class="period-name">${monthNames[Number(p.month)-1]} ${p.year}</span><strong class="period-total">${money(p.total_cost_rub)}</strong><svg class="chev" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7.5 4.8 5.2 5.2-5.2 5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></div><div class="period-meta"><div class="period-meta-item"><span>Погашено</span><b>${money(p.repaid_amount_rub)}</b></div><div class="period-meta-item"><span>Остаток</span><b class="${balanceClass(p.outstanding_amount_rub)}">${money(p.outstanding_amount_rub)}</b></div></div></button>`).join(''):empty('Нет доступных месяцев');
 $('content').innerHTML=`<div class="period-list">${periodHtml}</div>`;
}
function renderMonth(){
 currentSource=null;header('Баланс');
 const p=monthFact();if(!p){$('content').innerHTML=empty('Месяц не найден');return;}
 const total=num(p.total_cost_rub),repaid=num(p.repaid_amount_rub),outstanding=num(p.outstanding_amount_rub);
 const costs=[['salary','ЗП',num(p.salary_cost_rub)],['purchase','Закуп',num(p.purchase_cost_rub)],['body','Кузов',num(p.body_cost_rub)],['rental','Прокат',num(p.rental_cost_rub)]];
 const denom=total>0?total:costs.reduce((a,x)=>a+x[2],0);
 const costHtml=costs.map(([code,label,value])=>{const share=denom>0?Math.max(0,Math.min(100,value/denom*100)):0;return `<button type="button" class="cost-row" data-source="${code}"><div class="cost-line"><span class="cost-name">${label}</span><strong class="cost-amount">${money(value)}</strong><span class="cost-share">${share.toFixed(0)}%</span></div><div class="cost-track" aria-hidden="true"><div class="cost-fill" style="width:${share.toFixed(2)}%"></div></div></button>`}).join('');
 $('content').innerHTML=`<div class="summary-card"><div class="summary-top"><span class="summary-kicker">Итого за период</span><span class="period-pill">${esc(rangeLabel())}</span></div><div class="summary-grid"><div class="summary-metric"><span>Затраты</span><strong>${money(total)}</strong></div><button type="button" class="summary-metric action" data-repayments><span>Погашено</span><strong>${money(repaid)}</strong></button><div class="summary-metric"><span>Остаток</span><strong class="${balanceClass(outstanding)}">${money(outstanding)}</strong></div></div></div><section class="section"><div class="section-head"><h2>Структура затрат</h2><span>1 мес.</span></div><div class="cost-list">${costHtml}</div></section>`;
}
function renderSalary(rows){
  const groups=new Map();for(const r of rows){const id=Number(r.employee_id);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(r)}
  const sorted=[...groups.entries()].sort((a,b)=>String(employees.get(a[0])?.full_name||'').localeCompare(String(employees.get(b[0])?.full_name||''),'ru'));
  return sorted.length?`<div class="group-stack">${sorted.map(([id,items])=>{const employee=employees.get(id)||items[0];const total=sum(items,'amount_rub');return `<div class="group-card"><div class="group-head"><strong>${esc(employee.full_name||employee.short_name||('Сотрудник #'+id))}</strong><span>${money(total)}</span></div>${items.sort((a,b)=>String(a.payment_date).localeCompare(String(b.payment_date))).map(r=>`<div class="detail-row"><div class="detail-line"><div><div class="detail-title">${day(r.payment_date)}</div><div class="detail-meta">Отчётный период · ${esc(periodName(periodById.get(Number(r.reporting_period_id))))}</div></div><strong class="detail-amount">${money(r.amount_rub)}</strong></div></div>`).join('')}</div>`}).join('')}</div>`:empty('Нет зарплатных затрат за выбранный период')
}
function renderPurchase(rows){return rows.length?`<div class="group-stack">${rows.sort((a,b)=>String(a.purchase_date).localeCompare(String(b.purchase_date))).map(r=>`<div class="group-card"><div class="detail-row"><div class="detail-line"><div><div class="detail-title">${esc(r.item_name)}</div><div class="detail-meta">${day(r.purchase_date)} · ${esc(periodName(periodById.get(Number(r.reporting_period_id))))}</div><div class="detail-meta">${num(r.quantity).toLocaleString('ru-RU')} × ${money(r.unit_price_rub)} · НДС ${num(r.vat_percent).toLocaleString('ru-RU')}% · с НДС ${money(r.gross_amount_rub)}</div></div><strong class="detail-amount">${money(r.cost_amount_rub)}</strong></div></div></div>`).join('')}</div>`:empty('Нет закупок за выбранный период')}
function renderUpd(rows,kind){const dateKey=kind==='body'?'upd_body_id':'upd_rental_id';return rows.length?`<div class="group-stack">${rows.sort((a,b)=>String(a.upd_date).localeCompare(String(b.upd_date))||num(a[dateKey])-num(b[dateKey])).map(r=>`<div class="group-card"><div class="detail-row"><div class="detail-line"><div><div class="detail-title">УПД · ${day(r.upd_date)}</div><div class="detail-meta">${esc(periodName(periodById.get(Number(r.reporting_period_id))))}</div><div class="detail-meta">Сумма УПД ${money(r.upd_amount_rub)} · вычет ${num(r.profitability_percent).toLocaleString('ru-RU')}%</div></div><strong class="detail-amount">${money(r.cost_amount_rub)}</strong></div></div></div>`).join('')}</div>`:empty('Нет УПД за выбранный период')}

function renderSource(){
 const source=currentSource,p=monthFact(),cfg=sourceConfig[source];if(!cfg)return;
 header(source==='repayment'?'Погашения':cfg.heading);
 const amountField=source==='salary'||source==='repayment'?'amount_rub':'cost_amount_rub';
 const total=sum(rows,amountField);
 let body='';
 if(source==='salary')body=renderSalary([...rows]);
 else if(source==='purchase')body=renderPurchase([...rows]);
 else if(source==='body'||source==='rental')body=renderUpd([...rows],source);
 else body=rows.length?`<div class="group-stack">${[...rows].sort((a,b)=>String(a.payment_date).localeCompare(String(b.payment_date))).map(r=>`<div class="group-card"><div class="detail-row"><div class="detail-line"><div><div class="detail-title">${day(r.payment_date)}</div><div class="detail-meta">Погашение задолженности · ${esc(periodName(p))}</div></div><strong class="detail-amount">${money(r.amount_rub)}</strong></div></div></div>`).join('')}</div>`:empty('Нет погашений за выбранный период');
 const heading=source==='repayment'?'Платежи':'Состав';
 const summaryLabel=source==='repayment'?'Погашено':cfg.heading;
 $('content').innerHTML=`<div class="detail-summary"><div class="detail-summary-top"><span class="detail-summary-label">${esc(summaryLabel)}</span><span class="period-pill">${esc(rangeLabel())}</span></div><div class="detail-summary-total">${money(total)}</div></div><section class="section"><div class="section-head"><h2>${heading}</h2><span>${totalCount} запис.</span></div>${body}</section>${rows.length<totalCount?'<button class="period-row" type="button" data-more>Показать ещё</button>':''}`;
}
async function loadSource(id,source,append=false){
 const token=++seq;
 const key=id+':'+source;
 const cache=sourceCache.get(key);
 if(!append&&cached(cache)){
   rows=cache.data.rows;offset=rows.length;totalCount=cache.data.totalCount;
   renderSource();return;
 }
 if(!append)$('content').innerHTML=empty('Загрузка…');
 try{
   const result=await balanceApi.source(id,source,{limit:100,offset:append?offset:0});
   if(!active||token!==seq)return;
   rows=append?rows.concat(result.rows||[]):result.rows||[];
   offset=rows.length;totalCount=Number(result.total_count)||0;
   sourceCache.set(key,{at:Date.now(),data:{rows,totalCount}});
   for(const row of rows)if(row.employee_id&&!employees.has(Number(row.employee_id)))employees.set(Number(row.employee_id),row);
   renderSource();
 }catch(err){console.error('balance_source_failed',err);if(active&&token===seq)$('content').innerHTML=empty('Не удалось загрузить детализацию')+'<button type="button" data-retry>Повторить</button>';}
}
async function loadRoute(){
 const token=++seq;
 const r=route();
 currentId=r.id;currentSource=r.source;
 if(!currentId){renderRoot();return;}
 const known=monthCache.get(currentId)?.data;
 if(known){month=known;periodById.set(currentId,known);}
 if(currentSource){
   // Source data does not depend on a fresh month request. Fetch detail directly.
   await loadSource(currentId,currentSource);
   return;
 }
 if(known){renderMonth();return;}
 $('content').innerHTML=empty('Загрузка…');
 try{
   const result=await balanceApi.month(currentId);
   if(!active||token!==seq)return;
   month=result.month;
   monthCache.set(currentId,{at:Date.now(),data:month});
   periodById.set(currentId,month);
   renderMonth();
 }catch(err){console.error('balance_month_failed',err);if(active&&token===seq)$('content').innerHTML=empty('Не удалось загрузить месяц')+'<button type="button" data-retry>Повторить</button>';}
}
export const balancePage={
 code:'balance',name:'Баланс',
 async activate(){
   setup();active=true;staff().hidden=true;host().hidden=false;
   if(periods.length&&Date.now()-rootLoadedAt<CACHE_TTL_MS){void loadRoute();return;}
   $('content').innerHTML=empty('Загрузка…');
   const token=++seq;
   try{
     const result=await balanceApi.root();
     if(!active||token!==seq)return;
     periods=result.periods||[];
     rootLoadedAt=Date.now();
     periodById.clear();for(const p of periods)periodById.set(Number(p.reporting_period_id),p);
     await loadRoute();
   }catch(err){console.error('balance_root_failed',err);if(active&&token===seq)$('content').innerHTML=empty('Не удалось загрузить баланс')+'<button type="button" data-retry>Повторить</button>';}
 },
 deactivate(){active=false;seq++;currentId=null;currentSource=null;notify();host().hidden=true;}
};
