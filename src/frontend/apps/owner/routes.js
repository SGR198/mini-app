import { staffCostPage } from "../../pages/staff-cost/page.js";
import { balancePage } from "../../pages/balance/page.js";

import { workOrdersPage } from "../../pages/work-orders/page.js";

export const ownerRoutes=[
  {path:"/",page:staffCostPage,workspace:true},
  {path:"/staff-cost",page:staffCostPage,workspace:true},
  {path:"/balance",page:balancePage,workspace:true},
  {path:"/work-orders",page:workOrdersPage,workspace:true}
];
