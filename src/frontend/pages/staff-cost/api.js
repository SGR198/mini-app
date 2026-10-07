import { callMiniAppApi } from "../../shared/api/miniapp.js";
import { getTelegramInitData } from "../../shared/telegram/init-data.js";

const cache=new Map();
const inflight=new Map();

function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==="object"){
    return Object.fromEntries(Object.keys(value).sort().map((key)=>[key,stable(value[key])]));
  }
  return value;
}

function requestKey(action,params){
  return action+":"+JSON.stringify(stable(params));
}

async function request(action,params={},options={}){
  const key=requestKey(action,params);
  if(!options.force&&cache.has(key))return cache.get(key);
  if(!options.force&&inflight.has(key))return await inflight.get(key);

  const initData=getTelegramInitData();
  if(!initData)throw new Error("telegram_init_data_missing");

  const promise=callMiniAppApi({
    app:"owner",
    initData,
    action,
    params
  }).then((data)=>{
    cache.set(key,data);
    return data;
  }).finally(()=>inflight.delete(key));

  inflight.set(key,promise);
  return await promise;
}

function ids(periodIds){
  return [...new Set((periodIds||[]).map(Number).filter(Number.isSafeInteger))].sort((a,b)=>a-b);
}

export const staffCostApi={
  initial:(options={})=>request("staff_cost.initial",{},options),

  accruals:(periodIds,{limit=100,offset=0,force=false}={})=>
    request("staff_cost.accruals",{
      period_ids:ids(periodIds),
      limit,
      offset
    },{force}),

  employee:(staffMemberId,periodIds,{force=false}={})=>
    request("staff_cost.employee",{
      staff_member_id:Number(staffMemberId),
      period_ids:ids(periodIds)
    },{force}),

  employeeSource:(staffMemberId,reportingPeriodId,sourceCode,{force=false}={})=>
    request("staff_cost.employee_source",{
      staff_member_id:Number(staffMemberId),
      reporting_period_id:Number(reportingPeriodId),
      source_code:String(sourceCode)
    },{force}),

  repairPositions:(staffMemberId,reportingPeriodId,sourceCode,sourceItemId,{force=false}={})=>
    request("staff_cost.repair_positions",{
      staff_member_id:Number(staffMemberId),
      reporting_period_id:Number(reportingPeriodId),
      source_code:String(sourceCode),
      source_item_id:Number(sourceItemId)
    },{force}),

  mechanicalRepairAccruals:(periodIds,{force=false}={})=>
    request("staff_cost.mechanical_repair_accruals",{
      period_ids:ids(periodIds)
    },{force}),

  bodyRepairAccruals:(periodIds,{force=false}={})=>
    request("staff_cost.body_repair_accruals",{
      period_ids:ids(periodIds)
    },{force}),

  bodyRepairWorkOrders:(periodIds,{limit=100,cursor=null,force=false}={})=>
    request("staff_cost.body_repair_work_orders",{
      period_ids:ids(periodIds),
      limit,
      cursor
    },{force}),

  billingPayments:(dateFrom,dateTo,{limit=100,cursor=null,force=false}={})=>
    request("staff_cost.billing_payments",{
      date_from:dateFrom,
      date_to:dateTo,
      limit,
      cursor
    },{force}),

  payments:(dateFrom,dateTo,{
    staffMemberId=null,
    status=null,
    sourceCode=null,
    limit=100,
    cursor=null,
    force=false
  }={})=>request("staff_cost.payments",{
    date_from:dateFrom,
    date_to:dateTo,
    staff_member_id:staffMemberId,
    status,
    source_code:sourceCode,
    limit,
    cursor
  },{force}),

  statement:(periodIds,{limit=100,offset=0,force=false}={})=>
    request("staff_cost.statement",{
      period_ids:ids(periodIds),
      limit,
      offset
    },{force}),

  statementEmployee:(staffMemberId,periodIds,{force=false}={})=>
    request("staff_cost.statement_employee",{
      staff_member_id:Number(staffMemberId),
      period_ids:ids(periodIds)
    },{force}),

  statementMonth:(staffMemberId,reportingPeriodId,{force=false}={})=>
    request("staff_cost.statement_month",{
      staff_member_id:Number(staffMemberId),
      reporting_period_id:Number(reportingPeriodId)
    },{force}),

  summary:(periodIds,{force=false}={})=>
    request("staff_cost.summary",{
      period_ids:ids(periodIds)
    },{force}),

  clear(){
    cache.clear();
    inflight.clear();
  }
};
