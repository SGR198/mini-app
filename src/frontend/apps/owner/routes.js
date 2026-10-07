import { staffCostPage } from "../../pages/staff-cost/page.js";
import { balancePage } from "../../pages/balance/page.js";

export const ownerRoutes=[
  {path:"/",page:staffCostPage,workspace:true},
  {path:"/staff-cost",page:staffCostPage,workspace:true},
  {path:"/balance",page:balancePage,workspace:true}
];
