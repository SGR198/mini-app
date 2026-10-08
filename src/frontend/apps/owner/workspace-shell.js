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

  host.innerHTML=`<button class="workspace-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Настройки рабочей области"><span aria-hidden="true">⚙</span></button>
  <div class="workspace-menu" role="menu" hidden>
    ${workspaces.map((route)=>`<button type="button" role="menuitem" data-workspace="${route.page.code}">${route.page.name}</button>`).join("")}
  </div>`;

  let activeWorkspace="staff_cost";
  const trigger=host.querySelector(".workspace-trigger");
  const menu=host.querySelector(".workspace-menu");

  function setRootVisible(visible){
    host.hidden=!visible;
    document.body.classList.toggle("workspace-root-switcher",visible);
    if(!visible){menu.hidden=true;trigger.setAttribute("aria-expanded","false");}
  }
  setRootVisible(false);
  window.addEventListener("staff-cost:view-state",(event)=>setRootVisible(Boolean(event.detail?.root)));

  function routeFor(path){
    const normalized=normalizePath(path);
    return routes.find((route)=>normalizePath(route.path)===normalized)||defaultRoute;
  }

  async function activateRoute(route,{replace=true}={}){
    if(route.page.code!=="staff_cost")setRootVisible(false);
    await onActivate(route);
    activeWorkspace=route.page.code;
    host.dataset.workspace=route.page.code;
    host.querySelectorAll("[data-workspace]").forEach((button)=>{
      button.classList.toggle("active",button.dataset.workspace===route.page.code);
    });
    menu.hidden=true;
    trigger.setAttribute("aria-expanded","false");
    const target=route.page.code==="staff_cost"?"/":route.path;
    if(globalThis.location?.pathname!==target){
      const state={...(history.state||{}),miniappWorkspace:route.page.code};
      if(replace) history.replaceState(state,"",target);
      else history.pushState(state,"",target);
    }
  }

  trigger.addEventListener("click",()=>{
    menu.hidden=!menu.hidden;
    trigger.setAttribute("aria-expanded",String(!menu.hidden));
  });

  menu.addEventListener("click",(event)=>{
    const button=event.target.closest("[data-workspace]");
    if(!button) return;
    const route=workspaces.find((item)=>item.page.code===button.dataset.workspace);
    if(route) activateRoute(route,{replace:true});
  });

  return {
    activate(path,options){return activateRoute(routeFor(path),options);}
  };
}
