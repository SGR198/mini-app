import { callMiniAppApi } from "../../shared/api/miniapp.js";
import { getTelegramInitData } from "../../shared/telegram/init-data.js";
export async function listWorkOrders({year,month,limit=50,offset=0}) {
 const initData=getTelegramInitData();
 if(!initData)throw new Error("telegram_init_data_missing");
 return callMiniAppApi({initData,action:"work_orders.list",params:{year,month,limit,offset}});
}
