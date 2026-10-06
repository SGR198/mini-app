import { callMiniAppApi } from "../../shared/api/miniapp.js";
import { getTelegramInitData } from "../../shared/telegram/init-data.js";

let snapshotCache=null;
let snapshotPromise=null;

export async function loadStaffCostPageSnapshot({force=false}={}){
  if(!force&&snapshotCache)return snapshotCache;
  if(!force&&snapshotPromise)return snapshotPromise;

  const initData=getTelegramInitData();
  if(!initData)throw new Error("telegram_init_data_missing");

  snapshotPromise=callMiniAppApi({
    app:"owner",
    initData,
    action:"staff_cost.snapshot",
    params:{}
  }).then((data)=>{
    snapshotCache=data;
    return data;
  }).finally(()=>{
    snapshotPromise=null;
  });

  return await snapshotPromise;
}

export function getCachedStaffCostPageSnapshot(){
  return snapshotCache;
}

export function clearStaffCostPageSnapshotCache(){
  snapshotCache=null;
}
