const STAFF_PATHS=new Set(["/","/staff-cost"]);

function normalizePath(path){
  if(STAFF_PATHS.has(path)) return "/";
  return path;
}

export function createWorkspaceShell({routes,defaultRoute,onActivate}){
  const host=document.getElementById("workspace-switcher");
  if(!host) throw new Error("workspace_switcher_host_missing");

  const workspaces=routes.filter((route)=>route.workspace)
    .filter((route,index,all)=>all.findIndex((item)=>item.page.code===route.page.code)===index);

  host.innerHTML=`<button class="workspace-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Настройки рабочей области"><svg class="workspace-gear-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M9.7 2.5h4.6l.7 2.7a7.5 7.5 0 0 1 1.6.9l2.6-.8 2.3 4-1.9 1.9a8 8 0 0 1 0 1.8l1.9 1.9-2.3 4-2.6-.8a7.5 7.5 0 0 1-1.6.9l-.7 2.7H9.7L9 19a7.5 7.5 0 0 1-1.6-.9l-2.6.8-2.3-4 1.9-1.9a8 8 0 0 1 0-1.8L2.5 9.3l2.3-4 2.6.8A7.5 7.5 0 0 1 9 5.2z"/><circle cx="12" cy="12" r="3.1"/></svg></button>
  <div class="workspace-menu" role="menu" hidden>
    ${workspaces.map((route)=>`<button type="button" role="menuitem" data-workspace="${route.page.code}">${route.page.name}</button>`).join("")}
  </div>`;

  let activeWorkspace="staff_cost";
  let staffRoot=false;
  const trigger=host.querySelector(".workspace-trigger");
  const menu=host.querySelector(".workspace-menu");

  function setRootVisible(visible){
    host.hidden=!visible;
    document.body.classList.toggle("workspace-root-switcher",visible);
    if(!visible){menu.hidden=true;trigger.setAttribute("aria-expanded","false");}
  }
  setRootVisible(false);
  window.addEventListener("staff-cost:view-state",(event)=>{staffRoot=Boolean(event.detail?.root);if(activeWorkspace==="staff_cost")setRootVisible(staffRoot);});
  window.addEventListener("balance:view-state",()=>{if(activeWorkspace==="balance")setRootVisible(globalThis.location?.pathname==="/balance");});

  function routeFor(path){
    const normalized=normalizePath(path);
    if(normalized.startsWith("/balance/month/"))return routes.find((route)=>route.page.code==="balance")||defaultRoute;
    return routes.find((route)=>normalizePath(route.path)===normalized)||defaultRoute;
  }

  async function activateRoute(route,{replace=true}={}){
    // Establish route and workspace before asynchronous activation can emit view-state events.
    activeWorkspace=route.page.code;
    host.dataset.workspace=activeWorkspace;
    const target=activeWorkspace==="staff_cost"?"/":
      activeWorkspace==="balance"&&location.pathname.startsWith("/balance/month/")?location.pathname:route.path;
    if(location.pathname!==target){
      const state={...(history.state||{}),miniappWorkspace:activeWorkspace};
      if(replace)history.replaceState(state,"",target);
      else history.pushState(state,"",target);
    }
    const syncVisibility=()=>setRootVisible(activeWorkspace==="balance"
      ? location.pathname==="/balance"
      : activeWorkspace==="staff_cost"&&staffRoot);
    syncVisibility();
    host.querySelectorAll("[data-workspace]").forEach(button=>{
      button.classList.toggle("active",button.dataset.workspace===activeWorkspace);
    });
    menu.hidden=true;
    trigger.setAttribute("aria-expanded","false");
    await onActivate(route);
    if(activeWorkspace==="staff_cost"){
      const view=window.StaffCostDashboard?.getState?.();
      staffRoot=Boolean(view&&view.section==="accruals"&&view.view==="list");
    }
    syncVisibility();
  }

  trigger.addEventListener("click",()=>{
    menu.hidden=!menu.hidden;
    trigger.setAttribute("aria-expanded",String(!menu.hidden));
  });

  menu.addEventListener("click",(event)=>{
    const button=event.target.closest("[data-workspace]");
    if(!button) return;
    const route=workspaces.find((item)=>item.page.code===button.dataset.workspace);
    if(route){
      if(route.page.code==="balance"&&globalThis.location?.pathname.startsWith("/balance/month/"))history.replaceState({...history.state,balanceMonth:null},"","/balance");
      activateRoute(route,{replace:true});
    }
  });

  return {
    activate(path,options){return activateRoute(routeFor(path),options);}
  };
}
