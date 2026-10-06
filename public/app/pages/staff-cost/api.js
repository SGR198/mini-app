import { callMiniAppApi } from "../../shared/api/miniapp.js";
import { getTelegramInitData } from "../../shared/telegram/init-data.js";

export async function loadStaffCostUiSnapshot(){
  const initData=getTelegramInitData();
  if(!initData) throw new Error("telegram_init_data_missing");
  return await callMiniAppApi({
    app:"owner",
    initData,
    action:"staff_cost.ui_snapshot",
    params:{}
  });
}
