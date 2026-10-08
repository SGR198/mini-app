import { callMiniAppApi } from "../../shared/api/miniapp.js";
import { getTelegramInitData } from "../../shared/telegram/init-data.js";

async function request(action,params={}){
  const initData=getTelegramInitData();
  if(!initData)throw new Error("telegram_init_data_missing");
  return await callMiniAppApi({initData,action,params});
}
export const balanceApi={
  root:()=>request("balance.root"),
  month:(reportingPeriodId)=>request("balance.month",{reporting_period_id:Number(reportingPeriodId)})
};
