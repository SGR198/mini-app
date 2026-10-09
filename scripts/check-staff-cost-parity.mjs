import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { accrualScreenCodes, isAccrualDetailScreen } from "../src/frontend/pages/staff-cost/accrual-screens.js";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");

const canonical={
  dashboard_code:"staff_cost_accruals_v2",
  dashboard_version:35,
  database_commit:"427ff930a25e8519243f3bca0cfd4ccdc653083e",
  template_blob_sha:"951a18cc03b108704631cddee5cc4cc470bd02e9"
};

const rendererPath=join(root,"src/frontend/pages/staff-cost/renderer.js");
const cssPath=join(root,"src/frontend/styles/staff-cost.css");
const sourceIndexPath=join(root,"src/frontend/index.html");
const publicRendererPath=join(root,"public/app/pages/staff-cost/renderer.js");
const publicCssPath=join(root,"public/app/styles/staff-cost.css");
const publicIndexPath=join(root,"public/index.html");
const apiPath=join(root,"src/frontend/pages/staff-cost/api.js");
const accrualModulePaths=["mechanical-accrual-screen.js","body-accrual-screen.js","mechanical-service-advisor-screen.js","body-service-advisor-screen.js"].map(name=>join(root,"src/frontend/pages/staff-cost",name));

const [renderer,css,index,api,publicRenderer,publicCss,publicIndex]=await Promise.all([
  readFile(rendererPath,"utf8"),
  readFile(cssPath,"utf8"),
  readFile(sourceIndexPath,"utf8"),
  readFile(apiPath,"utf8"),
  readFile(publicRendererPath,"utf8"),
  readFile(publicCssPath,"utf8"),
  readFile(publicIndexPath,"utf8")
]);

const accrualModuleSources=await Promise.all(accrualModulePaths.map(path=>readFile(path,"utf8")));
const functionSources=[renderer,...accrualModuleSources].join("\n");

const requiredFunctions=[
  "renderAccruals",
  "openAccrualEmployee",
  "renderAccrualEmployee",
  "renderAccrualSource",
  "renderAccrualRepairPositions",
  "openMechanicalRepairAccruals",
  "renderMechanicalRepairAccruals",
  "openBodyRepairAccruals",
  "renderBodyRepairAccruals",
  "openBodyRepairWorkOrders",
  "renderBodyRepairWorkOrders",
  "bodyRepairCatalogCard",
  "openBillingPayments",
  "renderBillingPayments",
  "renderPayments",
  "renderPaymentEmployee",
  "renderPaymentDetail",
  "renderBalance",
  "renderBalanceEmployee",
  "renderBalanceMonth",
  "renderSummary",
  "renderSummaryMonth"
];

const rendererMarkers=[
  "base-manual",
  "repair-base-note",
  "База КТУ",
  "Работы ЗН",
  "Кузовные заказ-наряды",
  "Без КТУ",
  "Оплаты клиентов · по дате оплаты"
];

const cssMarkers=[
  ".body-calc-grid>div.base-manual",
  ".calc-base.base-manual",
  ".repair-base-note",
  ".repair-base-note.base-manual",
  ".body-order-group.no-ktu",
  ".client-payment-list"
];

const stateMarkers=[
  "accrual-list",
  "accrual-employee",
  "payment-list",
  "payment-employee",
  "balance-list",
  "filter-open"
];

const failures=[];
// source_totals is an object, never a numeric accumulator; quarter/year scopes must merge it by key.
if(!renderer.includes("field!=='employee_count'&&field!=='source_totals'")) failures.push("source_totals must be excluded from numeric summary aggregation");
if(!renderer.includes("Object.entries(part?.summary?.source_totals||{})")) failures.push("source_totals must merge by source code");

// Staff Cost payments: paid_at is the canonical instant; payment_date is API JSON compatibility.
if(!renderer.includes("function paymentMomentText(payment)")||!renderer.includes("timeZone:'Asia/Yekaterinburg'")) failures.push("Staff Cost paid_at timezone display contract missing");
if(!renderer.includes("function comparePaymentMoments(a,b)")||!renderer.includes(".sort((a,b)=>comparePaymentMoments(a,b))")) failures.push("Staff Cost paid_at sorting contract missing");


// All registered accrual detail views must use the SAME shell as worker screens.
for(const view of Object.values(accrualScreenCodes)){
  if(!isAccrualDetailScreen(view)) failures.push(`accrual view missing shared layout: ${view}`);
}
if(!renderer.includes("isAccrualDetailScreen(state.view)")){
  failures.push("accrual detail screens must use the shared layout registry in renderFilter");
}
if(isAccrualDetailScreen("list")) failures.push("root accrual list incorrectly classified as detail");

for(const name of requiredFunctions){
  if(!functionSources.includes(`function ${name}`)) failures.push(`missing function: ${name}`);
}
for(const marker of rendererMarkers){
  if(!renderer.includes(marker)) failures.push(`missing renderer marker: ${marker}`);
}
for(const marker of cssMarkers){
  if(!css.includes(marker)) failures.push(`missing css marker: ${marker}`);
}
const requiredActions=[
  "staff_cost.initial",
  "staff_cost.accruals",
  "staff_cost.employee",
  "staff_cost.employee_source",
  "staff_cost.repair_positions",
  "staff_cost.mechanical_repair_accruals",
  "staff_cost.body_repair_accruals",
  "staff_cost.body_repair_work_orders",
  "staff_cost.billing_payments",
  "staff_cost.payments",
  "staff_cost.statement",
  "staff_cost.statement_employee",
  "staff_cost.statement_month",
  "staff_cost.summary"
];
for(const action of requiredActions){
  if(!api.includes(`"${action}"`)) failures.push(`missing API action: ${action}`);
}
if(api.includes('"staff_cost.snapshot"')||api.includes('"staff_cost.ui_snapshot"')){
  failures.push("legacy Staff Cost snapshot action remains in frontend API");
}
for(const marker of stateMarkers){
  if(!renderer.includes(marker)) failures.push(`missing state marker: ${marker}`);
}

if(!index.includes('body class="app-boot"')) failures.push("missing boot state");
if(!renderer.includes("await render();")||!renderer.includes("document.body.classList.remove('app-boot');")){
  failures.push("missing async first render before boot reveal");
}
if(renderer.includes("loadStaffCostPageSnapshot")||renderer.includes("staff_cost.snapshot")){
  failures.push("renderer still depends on Staff Cost snapshot");
}

if(renderer!==publicRenderer) failures.push("generated renderer differs from source");
if(css!==publicCss) failures.push("generated CSS differs from source");
if(index!==publicIndex) failures.push("generated index differs from source");

if(failures.length){
  console.error("Staff Cost parity check failed");
  console.error(JSON.stringify({canonical,failures},null,2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok:true,
  canonical,
  checked:{
    functions:requiredFunctions.length,
    renderer_markers:rendererMarkers.length,
    css_markers:cssMarkers.length,
    state_markers:stateMarkers.length,
    bounded_actions:requiredActions.length
  }
},null,2));
