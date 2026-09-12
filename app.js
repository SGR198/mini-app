const EDGE_URL = "https://sfzacmpcpjviguhustym.supabase.co/functions/v1/staff-cost-miniapp";
const ACTION = "monthly_balance_summary";

const notFoundEl = document.getElementById("not-found");
const appEl = document.getElementById("app");
const summaryBodyEl = document.getElementById("summary-body");

function showNotFound() {
  appEl.hidden = true;
  notFoundEl.hidden = false;
  summaryBodyEl.replaceChildren();
}

function formatPeriod(row) {
  const year = Number(row?.reporting_year);
  const month = Number(row?.reporting_month);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return "—";
  return `${String(month).padStart(2, "0")}.${year}`;
}

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(amount)} ₽`;
}

function appendCell(rowEl, text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) cell.className = className;
  rowEl.append(cell);
}

function renderSummary(rows) {
  const fragment = document.createDocumentFragment();

  for (const row of rows) {
    const tr = document.createElement("tr");
    appendCell(tr, formatPeriod(row));
    appendCell(tr, formatMoney(row.accrual_total), "money");
    appendCell(tr, formatMoney(row.payment_total), "money");
    appendCell(tr, formatMoney(row.balance_to_pay), "money strong");
    fragment.append(tr);
  }

  summaryBodyEl.replaceChildren(fragment);
  notFoundEl.hidden = true;
  appEl.hidden = false;
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
      body: JSON.stringify({
        initData,
        action: ACTION,
        filters: { limit: 12 },
      }),
    });

    if (!response.ok) return;

    const payload = await response.json();
    if (payload?.ok !== true || payload?.action !== ACTION || !Array.isArray(payload?.data)) return;

    renderSummary(payload.data);
  } catch {
    showNotFound();
  }
}

start();
