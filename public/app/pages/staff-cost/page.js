import { staffCostApi } from "./api.js";
import { renderPeriodFilter } from "./components/period-filter.js";
import { renderTabs } from "./components/shell.js";
import { renderAccrualsView } from "./views/accruals.js";
import { renderEmployeeView } from "./views/employee.js";
import { renderPaymentsView, renderPaymentDetail } from "./views/payments.js";
import { renderStatementView, renderStatementEmployee } from "./views/statement.js";
import { renderSummaryView } from "./views/summary.js";
import { renderBodyRepairView } from "./views/body-repair.js";
import { formatStamp } from "../../shared/ui/format.js";
import { periodsForQuarter, quarterOf, selectedDateRange } from "../../shared/ui/periods.js";

const PAGE_LIMIT=20;

function periodKey(ids){
  return [...ids].map(Number).sort((a,b)=>a-b).join(",");
}

function mergePaged(current,next){
  if(!current) return next;
  const seen=new Set((current.items||[]).map((item)=>Number(item.id??item.staff_member_id)));
  const items=[...(current.items||[])];
  for(const item of next.items||[]){
    const id=Number(item.id??item.staff_member_id);
    if(!seen.has(id)){items.push(item);seen.add(id)}
  }
  return {...next,items};
}

class StaffCostController{
  constructor(){
    this.bootstrap=null;
    this.state={
      section:"accruals",
      view:"list",
      year:null,
      quarter:null,
      periodIds:[],
      paymentStatus:null,
      paymentSource:null,
      detailId:null,
      bodyMode:"accruals"
    };
    this.cache=new Map();
    this.loadSeq=0;
    this.observer=null;
  }

  get periods(){return this.bootstrap?.entities?.periods||[]}
  get sources(){return this.bootstrap?.entities?.payment_sources||[]}
  get content(){return document.getElementById("content")}

  async mount(){
    this.showLoading();
    try{
      this.bootstrap=await staffCostApi.bootstrap();
      const periods=this.periods.slice().sort((a,b)=>Number(a.year)-Number(b.year)||Number(a.month)-Number(b.month));
      const preferred=periods.find((p)=>Number(p.id)===Number(this.bootstrap?.config?.default_period_id))||periods.at(-1);
      if(!preferred) throw new Error("staff_cost_periods_missing");
      this.state.year=Number(preferred.year);
      this.state.quarter=quarterOf(preferred.month);
      this.state.periodIds=[Number(preferred.id)];
      this.renderChrome();
      await this.loadCurrent();
    }catch(error){
      this.showError(error);
    }
  }

  renderChrome(){
    renderTabs(this.state.section,(section)=>this.setSection(section));
    renderPeriodFilter({
      periods:this.periods,
      year:this.state.year,
      quarter:this.state.quarter,
      periodIds:this.state.periodIds,
      onYear:(year)=>this.selectYear(year),
      onQuarter:(quarter)=>this.selectQuarter(quarter),
      onMonth:(id)=>this.toggleMonth(id),
      onQuarterAll:()=>this.selectQuarter(this.state.quarter)
    });
    document.getElementById("controls")?.classList.toggle("hide",this.state.view!=="list");
  }

  setSnapshot(value){
    const node=document.getElementById("snapshot");
    if(node) node.textContent=value?("Данные на "+formatStamp(value)):"";
  }

  showLoading(){
    if(this.content) this.content.innerHTML='<div class="loading-state">Загрузка…</div>';
  }

  showError(error){
    console.error("staff_cost_native_error",error);
    if(this.content) this.content.innerHTML='<div class="error-state">Не удалось загрузить Staff Cost</div>';
  }

  resetObserver(){
    this.observer?.disconnect();
    this.observer=null;
  }

  installPrefetch(node,callback){
    this.resetObserver();
    if(!node||!callback) return;
    this.observer=new IntersectionObserver((entries)=>{
      if(entries.some((entry)=>entry.isIntersecting)){
        this.resetObserver();
        callback();
      }
    },{rootMargin:"600px 0px"});
    this.observer.observe(node);
  }

  invalidatePeriodCaches(){
    for(const key of [...this.cache.keys()]){
      if(key.startsWith("period:")) this.cache.delete(key);
    }
  }

  async setSection(section){
    if(!["accruals","payments","statement","summary"].includes(section)) return;
    this.state.section=section;
    this.state.view="list";
    this.state.detailId=null;
    this.renderChrome();
    await this.loadCurrent();
  }

  async selectYear(year){
    const rows=this.periods.filter((p)=>Number(p.year)===Number(year));
    if(!rows.length) return;
    const latest=rows.at(-1);
    this.state.year=Number(year);
    this.state.quarter=quarterOf(latest.month);
    this.state.periodIds=[Number(latest.id)];
    this.state.view="list";
    this.invalidatePeriodCaches();
    this.renderChrome();
    await this.loadCurrent();
  }

  async selectQuarter(quarter){
    const rows=periodsForQuarter(this.periods,this.state.year,quarter);
    if(!rows.length) return;
    this.state.quarter=Number(quarter);
    this.state.periodIds=rows.map((p)=>Number(p.id));
    this.state.view="list";
    this.invalidatePeriodCaches();
    this.renderChrome();
    await this.loadCurrent();
  }

  async toggleMonth(id){
    const quarterRows=periodsForQuarter(this.periods,this.state.year,this.state.quarter);
    const valid=new Set(quarterRows.map((p)=>Number(p.id)));
    if(!valid.has(Number(id))) return;
    const selected=new Set(this.state.periodIds.map(Number));
    if(selected.has(Number(id))){
      if(selected.size===1) return;
      selected.delete(Number(id));
    }else{
      selected.add(Number(id));
    }
    this.state.periodIds=[...selected].sort((a,b)=>a-b);
    this.state.view="list";
    this.invalidatePeriodCaches();
    this.renderChrome();
    await this.loadCurrent();
  }

  cacheKey(kind,extra=""){
    return `period:${periodKey(this.state.periodIds)}:${kind}:${extra}`;
  }

  async loadCurrent(){
    const seq=++this.loadSeq;
    this.resetObserver();
    this.showLoading();
    try{
      if(this.state.view==="employee"){
        const data=await staffCostApi.employee(this.state.detailId,this.state.periodIds);
        if(seq!==this.loadSeq) return;
        this.setSnapshot(data.generated_at);
        renderEmployeeView(this.content,{data,onBack:()=>this.backToList()});
        return;
      }
      if(this.state.view==="payment"){
        const payment=this.cache.get("payment-detail");
        if(seq!==this.loadSeq) return;
        renderPaymentDetail(this.content,{payment,onBack:()=>this.backToList()});
        return;
      }
      if(this.state.view==="statement_employee"){
        const data=await staffCostApi.statementEmployee(this.state.detailId,this.state.periodIds);
        if(seq!==this.loadSeq) return;
        this.setSnapshot(data.generated_at);
        renderStatementEmployee(this.content,{data,onBack:()=>this.backToList()});
        return;
      }
      if(this.state.view==="body_repair"){
        const key=this.cacheKey("body");
        let data=this.cache.get(key);
        if(!data){
          data=await staffCostApi.bodyRepair(this.state.periodIds);
          this.cache.set(key,data);
        }
        if(seq!==this.loadSeq) return;
        this.setSnapshot(data.generated_at);
        renderBodyRepairView(this.content,{
          data,
          mode:this.state.bodyMode,
          onMode:(mode)=>{this.state.bodyMode=mode;this.loadCurrent()},
          onBack:()=>this.backToList()
        });
        return;
      }

      if(this.state.section==="accruals") return await this.loadAccruals(seq);
      if(this.state.section==="payments") return await this.loadPayments(seq);
      if(this.state.section==="statement") return await this.loadStatement(seq);
      if(this.state.section==="summary") return await this.loadSummary(seq);
    }catch(error){
      if(seq===this.loadSeq) this.showError(error);
    }
  }

  async loadAccruals(seq,offset=0){
    const key=this.cacheKey("accruals");
    const next=await staffCostApi.accruals(this.state.periodIds,PAGE_LIMIT,offset);
    if(seq!==this.loadSeq) return;
    const data=offset?mergePaged(this.cache.get(key),next):next;
    this.cache.set(key,data);
    this.setSnapshot(data.generated_at);
    renderAccrualsView(this.content,{
      data,
      onEmployee:(id)=>this.openEmployee(id),
      onBodyRepair:()=>this.openBodyRepair(),
      onLoadMore:(node,nextOffset)=>this.installPrefetch(node,()=>this.loadAccruals(this.loadSeq,nextOffset))
    });
  }

  async loadPayments(seq,offset=0){
    const range=selectedDateRange(this.periods,this.state.periodIds);
    if(!range.dateFrom||!range.dateTo) throw new Error("payment_period_missing");
    const extra=`${this.state.paymentStatus||""}:${this.state.paymentSource||""}`;
    const key=this.cacheKey("payments",extra);
    const next=await staffCostApi.payments({
      dateFrom:range.dateFrom,
      dateTo:range.dateTo,
      status:this.state.paymentStatus,
      sourceCode:this.state.paymentSource,
      limit:PAGE_LIMIT,
      offset
    });
    if(seq!==this.loadSeq) return;
    const data=offset?mergePaged(this.cache.get(key),next):next;
    this.cache.set(key,data);
    this.setSnapshot(data.generated_at);
    renderPaymentsView(this.content,{
      data,
      filters:{status:this.state.paymentStatus,sourceCode:this.state.paymentSource},
      sources:this.sources,
      onFilter:async(change)=>{
        if(Object.hasOwn(change,"status")) this.state.paymentStatus=change.status;
        if(Object.hasOwn(change,"sourceCode")) this.state.paymentSource=change.sourceCode;
        await this.loadCurrent();
      },
      onPayment:(payment)=>this.openPayment(payment),
      onLoadMore:(node,nextOffset)=>this.installPrefetch(node,()=>this.loadPayments(this.loadSeq,nextOffset))
    });
  }

  async loadStatement(seq,offset=0){
    const key=this.cacheKey("statement");
    const next=await staffCostApi.statement(this.state.periodIds,PAGE_LIMIT,offset);
    if(seq!==this.loadSeq) return;
    const data=offset?mergePaged(this.cache.get(key),next):next;
    this.cache.set(key,data);
    this.setSnapshot(data.generated_at);
    renderStatementView(this.content,{
      data,
      onEmployee:(id)=>this.openStatementEmployee(id),
      onLoadMore:(node,nextOffset)=>this.installPrefetch(node,()=>this.loadStatement(this.loadSeq,nextOffset))
    });
  }

  async loadSummary(seq){
    const key=this.cacheKey("summary");
    let data=this.cache.get(key);
    if(!data){
      data=await staffCostApi.summary(this.state.periodIds);
      this.cache.set(key,data);
    }
    if(seq!==this.loadSeq) return;
    this.setSnapshot(data.generated_at);
    renderSummaryView(this.content,{data});
  }

  async openEmployee(id){
    this.state.view="employee";
    this.state.detailId=id;
    this.renderChrome();
    await this.loadCurrent();
  }

  async openPayment(payment){
    this.cache.set("payment-detail",payment);
    this.state.view="payment";
    this.state.detailId=payment?.id||null;
    this.renderChrome();
    await this.loadCurrent();
  }

  async openStatementEmployee(id){
    this.state.view="statement_employee";
    this.state.detailId=id;
    this.renderChrome();
    await this.loadCurrent();
  }

  async openBodyRepair(){
    this.state.view="body_repair";
    this.state.bodyMode="accruals";
    this.renderChrome();
    await this.loadCurrent();
  }

  async backToList(){
    this.state.view="list";
    this.state.detailId=null;
    this.renderChrome();
    await this.loadCurrent();
  }
}

const controller=new StaffCostController();

export const staffCostPage={
  code:"staff_cost",
  name:"Staff Cost",
  mount:()=>controller.mount()
};
