const MINIAPP_ENDPOINT = "/api/miniapp";

export async function callMiniAppApi({
  app = "owner",
  initData,
  action,
  params = {},
}) {
  const response = await fetch(MINIAPP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app,
      initData,
      action,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error("miniapp_api_request_failed");
  }

  return await response.json();
}
