const EDGE_URL = "https://sfzacmpcpjviguhustym.supabase.co/functions/v1/staff-cost-miniapp";
const FALLBACK_MESSAGE = "Страница не найдена";
const SUCCESS_MESSAGE = "Привет, я твой первый мини-апп";

const messageEl = document.getElementById("message");

function showNotFound() {
  messageEl.textContent = FALLBACK_MESSAGE;
}

async function start() {
  showNotFound();

  const webApp = window.Telegram?.WebApp;
  const initData = webApp?.initData ?? "";

  if (!initData) return;

  try {
    webApp.ready();

    const response = await fetch(EDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    });

    if (!response.ok) return;

    const data = await response.json();
    if (data?.ok === true) {
      messageEl.textContent = SUCCESS_MESSAGE;
    }
  } catch {
    showNotFound();
  }
}

start();
