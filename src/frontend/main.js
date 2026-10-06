import { ownerApp } from "./apps/owner/app.js";

ownerApp.mount().catch((error)=>{
  console.error("miniapp_mount_failed",error);
  const root=document.getElementById("content");
  if(root) root.innerHTML='<div class="error-state">Не удалось открыть приложение</div>';
});
