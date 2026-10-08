import { balanceApi } from "./api.js";

const staffHost=()=>document.getElementById("staff-cost-workspace");
const balanceHost=()=>document.getElementById("balance-workspace");
const months=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const rub=(value)=>new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:2}).format(Number(value)||0);
const safe=(value)=>String(value??"").replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const periodTitle=(p)=>`${months[Number(p.month)-1]||""} ${p.year}`;
const monthPath=(id)=>`/balance/month/${id}`;
const monthIdFromPath=()=>{const parts=location.pathname.split("/").filter(Boolean);return parts.length===3&&parts[0]==="balance"&&parts[1]==="month"&&/^[0-9]+$/.test(parts[2])?Number(parts[2]):null;};
let rootData=null;
const monthCache=new Map();
let active=false;
let requestId=0;
let currentMonth=null;
let initialized=false;

const sources={
  salary:{label:"Заработная плата",amount:"amount_rub",date:"payment_date",title:(r)=>r.short_name||r.full_name||"Выплата"},
  purchase:{label:"Закупки",amount:"cost_amount_rub",date:"purchase_date",title:(r)=>r.item_name||"Закупка"},
  body:{label:"Кузовной ремонт",amount:"cost_amount_rub",date:"upd_date",title:(r)=>"УПД №"+r.upd_body_id},
  rental:{label:"Прокат",amount:"cost_amount_rub",date:"upd_date",title:(r)=>"УПД №"+r.upd_rental_id},
  repayment:{label:"Погашения",amount:"amount_rub",date:"payment_date",title:(r)=>"Погашение №"+r.debit_payment_id}
};
const routeParts=()=>location.pathname.split("/").filter(Boolean);
const sourceRoute=()=>{const p=routeParts();return p.length===5&&p[0]==="balance"&&p[1]==="month"&&/^[0-9]+$/.test(p[2])&&p[3]==="source"&&sources[p[4]]?{id:Number(p[2]),source:p[4]}:null;};
const sourcePath=(id,code)=>monthPath(id)+"/source/"+code;
const dateText=(v)=>v?new Date(String(v).slice(0,10)+"T12:00:00").toLocaleDateString("ru-RU"):"";
let currentSource=null;
let sourceOffset=0;
let sourceRows=[];
let sourceTotal=0;
async function showSource(id,code,append=false){
  if(!sources[code])return;
  const token=++requestId;
  const host=balanceHost();
  const offset=append?sourceOffset:0;
  if(!append&&host)host.innerHTML='<div class="balance-loading">Загрузка детализации…</div>';
  try{
    const payload=await balanceApi.source(id,code,{limit:50,offset});
    if(!active||token!==requestId)return;
    currentMonth=id;currentSource=code;
    sourceRows=append?sourceRows.concat(payload.rows||[]):payload.rows||[];
    sourceOffset=sourceRows.length;
    sourceTotal=Number(payload.total_count)||0;
    notifyRoot();
    const meta=sources[code];
    const month=monthCache.get(id)?.month||rootData?.periods?.find(p=>Number(p.reporting_period_id)===id);
    if(host)host.innerHTML=`<section class="balance-page">
      <header class="balance-heading balance-month-heading"><button type="button" class="balance-back" data-balance-back aria-label="Назад к месяцу">←</button>
        <div><div class="balance-kicker">${safe(periodTitle(month||{month:1,year:""}))}</div><h1>${safe(meta.label)}</h1></div></header>
      <p class="balance-source-count">${sourceTotal} записей</p>
      <div class="balance-cost-list">${sourceRows.map(r=>`<div class="balance-cost-row balance-detail-row">
        <div><strong>${safe(meta.title(r))}</strong><small>${safe(dateText(r[meta.date]))}</small></div>
        <strong>${rub(r[meta.amount])}</strong>
      </div>`).join("")||'<p class="balance-empty">За этот месяц записей нет</p>'}</div>
      ${sourceOffset<sourceTotal?'<button class="balance-more" data-balance-more type="button">Показать ещё</button>':""}
    </section>`;
  }catch(error){
    console.error("balance_source_failed",error);
    if(active&&token===requestId&&host)host.innerHTML='<div class="balance-error">Не удалось загрузить детализацию. <button type="button" data-balance-retry-source>Повторить</button></div>';
  }
}


function syncBack(){
  const back=globalThis.Telegram?.WebApp?.BackButton;
  if(!back)return;
  if(active&&currentMonth)back.show?.();
  else back.hide?.();
}
function notifyRoot(){
  window.dispatchEvent(new CustomEvent("balance:view-state",{detail:{root:!currentMonth}}));
  syncBack();
}
function renderRoot(){
  currentMonth=null;
  currentSource=null;
  notifyRoot();
  const host=balanceHost();if(!host)return;
  const periods=Array.isArray(rootData?.periods)?rootData.periods:[];
  host.innerHTML=`<section class="balance-page">
    <header class="balance-heading"><div class="balance-kicker">Финансы · по месяцам</div><h1>Баланс</h1>
      <span class="balance-actuality">Данные из базы · актуально на момент открытия</span></header>
    <div class="balance-month-list">${periods.map((p)=>`<button type="button" class="balance-month-card" data-month="${Number(p.reporting_period_id)}">
      <span class="balance-month-name">${safe(periodTitle(p))}</span>
      <span class="balance-month-amount">${rub(p.outstanding_amount_rub)}</span>
      <span class="balance-month-chevron" aria-hidden="true">›</span>
    </button>`).join("")||'<p class="balance-empty">Нет отчётных периодов</p>'}</div>
  </section>`;
}
function renderMonth(payload){
  const month=payload?.month;
  if(!month)throw new Error("balance_month_payload_missing");
  currentMonth=Number(month.reporting_period_id);
  currentSource=null;
  notifyRoot();
  const host=balanceHost();if(!host)return;
  const costs=[["Заработная плата",month.salary_cost_rub,"salary"],["Закупки",month.purchase_cost_rub,"purchase"],["Кузовной ремонт",month.body_cost_rub,"body"],["Прокат",month.rental_cost_rub,"rental"],["Погашения",month.repaid_amount_rub,"repayment"]];
  host.innerHTML=`<section class="balance-page">
    <header class="balance-heading balance-month-heading"><button type="button" class="balance-back" data-balance-back aria-label="К списку месяцев">←</button>
      <div><div class="balance-kicker">Баланс · отчётный месяц</div><h1>${safe(periodTitle(month))}</h1></div></header>
    <div class="balance-summary">
      <div class="balance-summary-item"><span>Затраты</span><strong>${rub(month.total_cost_rub)}</strong></div>
      <div class="balance-summary-item"><span>Погашено</span><strong>${rub(month.repaid_amount_rub)}</strong></div>
      <div class="balance-summary-item balance-outstanding"><span>Остаток</span><strong>${rub(month.outstanding_amount_rub)}</strong></div>
    </div>
    <h2 class="balance-subtitle">Структура затрат</h2>
    <div class="balance-cost-list">${costs.map(([label,value,code])=>`<button type="button" class="balance-cost-row balance-source-link" data-balance-source="${code}"><span>${label}</span><strong>${rub(value)} ›</strong></button>`).join("")}</div>

  </section>`;
}
async function showMonth(id){
  if(!Number.isSafeInteger(id)||id<=0){renderRoot();return;}
  currentSource=null;
  const token=++requestId;
  const host=balanceHost();
  if(host)host.innerHTML='<div class="balance-loading">Загрузка месяца…</div>';
  try{
    let payload=monthCache.get(id);
    if(!payload){payload=await balanceApi.month(id);monthCache.set(id,payload);}
    if(!active||token!==requestId)return;
    renderMonth(payload);
  }catch(error){
    console.error("balance_month_failed",error);
    if(active&&token===requestId&&host)host.innerHTML='<div class="balance-error">Не удалось загрузить месяц. <button type="button" data-balance-retry>Повторить</button></div>';
  }
}
function back(){
  if(!active||!currentMonth)return;
  if(currentSource){
    const id=currentMonth;history.replaceState({...history.state,balanceSource:null},"",monthPath(id));void showMonth(id);return;
  }
  if(history.state?.balanceMonth)history.back();
  else {history.replaceState({...history.state,balanceMonth:null},"","/balance");renderRoot();}
}
async function onPop(){
  if(!active)return;
  const detail=sourceRoute();
  if(detail){await showSource(detail.id,detail.source);return;}
  const id=monthIdFromPath();
  if(id)await showMonth(id);
  else renderRoot();
}
function init(){
  if(initialized)return;
  initialized=true;
  const host=balanceHost();
  host?.addEventListener("click",(event)=>{
    const target=event.target.closest("button");
    if(!target)return;
    if(target.matches("[data-balance-back]")){back();return;}
    if(target.matches("[data-balance-retry-root]")){rootData=null;void balancePage.activate();return;}
    if(target.matches("[data-balance-more]")){if(currentMonth&&currentSource)void showSource(currentMonth,currentSource,true);return;}
    if(target.matches("[data-balance-retry-source]")){const detail=sourceRoute();if(detail)void showSource(detail.id,detail.source);return;}
    if(target.hasAttribute("data-balance-source")){const code=target.dataset.balanceSource;if(currentMonth&&sources[code]){history.pushState({...history.state,balanceSource:code},"",sourcePath(currentMonth,code));void showSource(currentMonth,code);}return;}
    if(target.matches("[data-balance-retry]")){const id=monthIdFromPath();if(id)void showMonth(id);return;}
    const id=target.hasAttribute("data-month")?Number(target.dataset.month):NaN;
    if(Number.isSafeInteger(id)&&id>0){
      history.pushState({...history.state,balanceMonth:id},"",monthPath(id));
      void showMonth(id);
    }
  });
  window.addEventListener("popstate",()=>{void onPop();});
  globalThis.Telegram?.WebApp?.BackButton?.onClick?.(back);
}
export const balancePage={
  code:"balance",
  name:"Баланс",
  async activate(){
    init();
    active=true;
    const staff=staffHost(),host=balanceHost();
    if(staff)staff.hidden=true;
    if(host){host.hidden=false;host.innerHTML='<div class="balance-loading">Загрузка баланса…</div>';}
    const token=++requestId;
    try{
      if(!rootData)rootData=await balanceApi.root();
      if(!active||token!==requestId)return;
      const detail=sourceRoute();
      if(detail)await showSource(detail.id,detail.source);
      else {const id=monthIdFromPath();if(id)await showMonth(id);else renderRoot();}
    }catch(error){
      console.error("balance_root_failed",error);
      if(active&&token===requestId&&host)host.innerHTML='<div class="balance-error">Не удалось загрузить баланс. <button type="button" data-balance-retry-root>Повторить</button></div>';
    }
  },
  deactivate(){
    active=false;requestId++;currentMonth=null;currentSource=null;syncBack();
    const host=balanceHost();if(host)host.hidden=true;
  }
};
