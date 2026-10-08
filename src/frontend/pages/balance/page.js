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
  notifyRoot();
  const host=balanceHost();if(!host)return;
  const costs=[["Заработная плата",month.salary_cost_rub],["Закупки",month.purchase_cost_rub],["Кузовной ремонт",month.body_cost_rub],["Прокат",month.rental_cost_rub]];
  host.innerHTML=`<section class="balance-page">
    <header class="balance-heading balance-month-heading"><button type="button" class="balance-back" data-balance-back aria-label="К списку месяцев">←</button>
      <div><div class="balance-kicker">Баланс · отчётный месяц</div><h1>${safe(periodTitle(month))}</h1></div></header>
    <div class="balance-summary">
      <div class="balance-summary-item"><span>Затраты</span><strong>${rub(month.total_cost_rub)}</strong></div>
      <div class="balance-summary-item"><span>Погашено</span><strong>${rub(month.repaid_amount_rub)}</strong></div>
      <div class="balance-summary-item balance-outstanding"><span>Остаток</span><strong>${rub(month.outstanding_amount_rub)}</strong></div>
    </div>
    <h2 class="balance-subtitle">Структура затрат</h2>
    <div class="balance-cost-list">${costs.map(([label,value])=>`<div class="balance-cost-row"><span>${label}</span><strong>${rub(value)}</strong></div>`).join("")}</div>
    <p class="balance-detail-note">Детализация статей будет доступна на следующем этапе.</p>
  </section>`;
}
async function showMonth(id){
  if(!Number.isSafeInteger(id)||id<=0){renderRoot();return;}
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
  if(history.state?.balanceMonth)history.back();
  else {history.replaceState({...history.state,balanceMonth:null},"","/balance");renderRoot();}
}
async function onPop(){
  if(!active)return;
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
      const id=monthIdFromPath();
      if(id)await showMonth(id);
      else renderRoot();
    }catch(error){
      console.error("balance_root_failed",error);
      if(active&&token===requestId&&host)host.innerHTML='<div class="balance-error">Не удалось загрузить баланс. <button type="button" data-balance-retry-root>Повторить</button></div>';
    }
  },
  deactivate(){
    active=false;requestId++;currentMonth=null;syncBack();
    const host=balanceHost();if(host)host.hidden=true;
  }
};
