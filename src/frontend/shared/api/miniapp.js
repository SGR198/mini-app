const MINIAPP_ENDPOINT = "/api/miniapp";

export async function callMiniAppApi({
  app = "owner",
  initData,
  action,
  params = {},
}) {
  const started=performance.now();
  const response = await fetch(MINIAPP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app, initData, action, params }),
  });
  const clientMs=performance.now()-started;
  const serverTiming=response.headers.get("Server-Timing")||"";
  const configCache=response.headers.get("X-Miniapp-App-Config-Cache")||"";

  console.info("miniapp_api_timing",{
    action,
    client_ms:Number(clientMs.toFixed(1)),
    server_timing:serverTiming,
    app_config_cache:configCache
  });

  if (!response.ok) throw new Error("miniapp_api_request_failed");

  const envelope = await response.json();
  if (envelope?.ok !== true || envelope?.action !== action || envelope?.data == null) {
    throw new Error("miniapp_api_response_invalid");
  }

  return envelope.data;
}
