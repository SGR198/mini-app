const STAFF_COST_PATH = "/api/staff-cost";
const MINIAPP_PATH = "/api/miniapp";

function jsonError(status, message, extraHeaders = {}) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

async function proxyJsonPost(request, upstreamUrl, upstreamOrigin) {
  if (request.method !== "POST") {
    return jsonError(405, "method_not_allowed", { Allow: "POST" });
  }

  if (!upstreamUrl) {
    return jsonError(502, "upstream_not_configured");
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("Content-Type") || "application/json",
        Origin: upstreamOrigin,
      },
      body: request.body,
      redirect: "manual",
    });

    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
    );
    headers.set("Cache-Control", "no-store");

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return jsonError(502, "upstream_unavailable");
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === STAFF_COST_PATH) {
      return proxyJsonPost(
        request,
        env.SUPABASE_STAFF_COST_URL,
        env.SUPABASE_ALLOWED_ORIGIN,
      );
    }

    if (url.pathname === MINIAPP_PATH) {
      return proxyJsonPost(
        request,
        env.SUPABASE_MINIAPP_URL,
        env.SUPABASE_ALLOWED_ORIGIN,
      );
    }

    if (url.pathname.startsWith("/api/")) {
      return jsonError(404, "not_found");
    }

    return jsonError(404, "not_found");
  },
};
