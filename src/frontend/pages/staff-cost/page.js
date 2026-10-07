import { mountStaffCostDashboard2 } from "./renderer.js";

const host=()=>document.getElementById("staff-cost-workspace");

export const staffCostPage={
  code:"staff_cost",
  name:"Staff Cost",
  async mount(){
    await mountStaffCostDashboard2();
  },
  async activate(){
    const element=host();
    if(element) element.hidden=false;
  },
  deactivate(){
    const element=host();
    if(element) element.hidden=true;
  }
};
