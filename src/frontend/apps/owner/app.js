import { ownerRoutes } from "./routes.js";
import { createWorkspaceShell } from "./workspace-shell.js";

export const ownerApp={
  code:"owner",
  routes:ownerRoutes,
  async mount(){
    const staffRoute=ownerRoutes.find((item)=>item.page.code==="staff_cost");
    if(!staffRoute) throw new Error("staff_cost_route_missing");

    // Staff Cost remains the default mounted workspace and keeps its in-memory
    // navigation state while another workspace is active.
    await staffRoute.page.mount();

    const shell=createWorkspaceShell({
      routes:ownerRoutes,
      defaultRoute:staffRoute,
      onActivate:async(route)=>{
        for(const item of ownerRoutes){
          if(item.page.code!==route.page.code) item.page.deactivate?.();
        }
        await route.page.activate?.();
      }
    });

    await shell.activate(globalThis.location?.pathname||"/",{replace:true});
  }
};
