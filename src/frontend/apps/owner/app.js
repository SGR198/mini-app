import { ownerRoutes } from "./routes.js";

export const ownerApp={
  code:"owner",
  routes:ownerRoutes,
  async mount(){
    const path=globalThis.location?.pathname||"/";
    const route=ownerRoutes.find((item)=>item.path===path)||ownerRoutes[0];
    await route.page.mount();
  }
};
