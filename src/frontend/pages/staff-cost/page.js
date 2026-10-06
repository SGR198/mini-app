import { mountStaffCostDashboard2 } from "./renderer.js";

export const staffCostPage={
  code:"staff_cost",
  name:"Staff Cost",
  async mount(){
    await mountStaffCostDashboard2();
  }
};
