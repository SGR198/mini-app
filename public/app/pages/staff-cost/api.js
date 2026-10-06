import { callMiniAppApi } from "../../shared/api/miniapp.js";
import { getTelegramInitData } from "../../shared/telegram/init-data.js";

function request(action,params={}) {
  const initData=getTelegramInitData();
  if (!initData) throw new Error("telegram_init_data_missing");
  return callMiniAppApi({app:"owner",initData,action,params});
}

export const staffCostApi={
  bootstrap:()=>request("staff_cost.bootstrap"),
  accruals:(periodIds,limit=20,offset=0)=>request("staff_cost.accruals",{period_ids:periodIds,limit,offset}),
  employee:(staffMemberId,periodIds)=>request("staff_cost.employee",{staff_member_id:staffMemberId,period_ids:periodIds}),
  payments:({dateFrom,dateTo,staffMemberId=null,status=null,sourceCode=null,limit=20,offset=0})=>
    request("staff_cost.payments",{
      date_from:dateFrom,
      date_to:dateTo,
      staff_member_id:staffMemberId,
      status,
      source_code:sourceCode,
      limit,
      offset
    }),
  statement:(periodIds,limit=20,offset=0)=>request("staff_cost.statement",{period_ids:periodIds,limit,offset}),
  statementEmployee:(staffMemberId,periodIds)=>request("staff_cost.statement_employee",{staff_member_id:staffMemberId,period_ids:periodIds}),
  summary:(periodIds)=>request("staff_cost.summary",{period_ids:periodIds}),
  bodyRepair:(periodIds)=>request("staff_cost.body_repair",{period_ids:periodIds})
};
