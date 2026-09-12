const EDGE_URL = "https://sfzacmpcpjviguhustym.supabase.co/functions/v1/staff-cost-miniapp";
const ACTION = "employee_accrual_summary";
const YEAR = 2026;
const QUARTER_MONTHS = [7, 8, 9];
const MONTH_LABELS = {
  7: "Июль",
  8: "Август",
  9: "Сентябрь",
};

const notFoundEl = document.getElementById("not-found");
const appEl = document.getElementById("app");
const totalAccrualEl = document.getElementById("total-accrual");
const employeeListEl = document.getElementById("employee-list");
const periodButtons = [...document.querySelectorAll(".period-button")];

let selectedMonths = new Set(QUARTER_MONTHS);
let expandedEmployeeIds = new Set();
let requestVersion = 0;

function showNotFound() {
  appEl.hidden = true;
  notFoundEl.hidden = false;
  employeeListEl.replaceChildren();
}

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)} ₽`;
}

function sortedMonths() {
  return [...selectedMonths].sort((a, b) => a - b);
}

function isAllSelected() {
  return QUARTER_MONTHS.every((month) => selectedMonths.has(month));
}

function syncPeriodButtons() {
  const allSelected = isAllSelected();

  for (const button of periodButtons) {
    const isAllButton = button.dataset.period === "all";
    const month = Number(button.dataset.month);
    const active = isAllButton ? allSelected : selectedMonths.has(month);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function createChevron() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("employee-chevron");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M5.5 7.5 10 12l4.5-4.5");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.8");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);

  return svg;
}

function createPeriodRow(period) {
  const row = document.createElement("div");
  row.className = "period-detail-row";

  const month = Number(period?.reporting_month);
  const label = document.createElement("span");
  label.className = "period-detail-label";
  label.textContent = MONTH_LABELS[month] ?? String(month);

  const amount = document.createElement("strong");
  amount.className = "period-detail-amount money";
  amount.textContent = formatMoney(period?.accrual_total);

  row.append(label, amount);
  return row;
}

function createEmployeeCard(employee) {
  const staffMemberId = String(employee?.staff_member_id ?? "");
  const detailsId = `employee-details-${staffMemberId}`;
  const periods = Array.isArray(employee?.periods) ? employee.periods : [];
  const isExpanded = expandedEmployeeIds.has(staffMemberId);

  const card = document.createElement("section");
  card.className = "employee-card";
  card.dataset.staffMemberId = staffMemberId;

  const summaryButton = document.createElement("button");
  summaryButton.type = "button";
  summaryButton.className = "employee-summary";
  summaryButton.setAttribute("aria-expanded", isExpanded ? "true" : "false");
  summaryButton.setAttribute("aria-controls", detailsId);

  const name = document.createElement("span");
  name.className = "employee-name";
  name.textContent = employee?.fio_full ?? "—";

  const amount = document.createElement("strong");
  amount.className = "employee-amount money";
  amount.textContent = formatMoney(employee?.accrual_total);

  const chevron = createChevron();
  summaryButton.append(name, amount, chevron);

  const details = document.createElement("div");
  details.id = detailsId;
  details.className = "employee-details";
  details.hidden = !isExpanded;

  for (const period of periods) {
    details.append(createPeriodRow(period));
  }

  summaryButton.addEventListener("click", () => {
    const expanded = summaryButton.getAttribute("aria-expanded") === "true";
    const nextExpanded = !expanded;

    summaryButton.setAttribute("aria-expanded", nextExpanded ? "true" : "false");
    details.hidden = !nextExpanded;
    card.classList.toggle("expanded", nextExpanded);

    if (nextExpanded) {
      expandedEmployeeIds.add(staffMemberId);
    } else {
      expandedEmployeeIds.delete(staffMemberId);
    }
  });

  card.classList.toggle("expanded", isExpanded);
  card.append(summaryButton, details);
  return card;
}

function renderEmployees(data) {
  const employees = Array.isArray(data?.employees) ? data.employees : [];
  totalAccrualEl.textContent = formatMoney(data?.total_accrual ?? 0);

  const visibleIds = new Set(employees.map((employee) => String(employee?.staff_member_id ?? "")));
  expandedEmployeeIds = new Set([...expandedEmployeeIds].filter((id) => visibleIds.has(id)));

  const fragment = document.createDocumentFragment();
  for (const employee of employees) {
    fragment.append(createEmployeeCard(employee));
  }

  employeeListEl.replaceChildren(fragment);
  notFoundEl.hidden = true;
  appEl.hidden = false;
}

async function loadAccruals(initData) {
  const version = ++requestVersion;

  try {
    appEl.setAttribute("aria-busy", "true");

    const response = await fetch(EDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData,
        action: ACTION,
        filters: {
          year: YEAR,
          months: sortedMonths(),
        },
      }),
    });

    if (version !== requestVersion) return;
    if (!response.ok) return showNotFound();

    const payload = await response.json();
    if (
      payload?.ok !== true ||
      payload?.action !== ACTION ||
      !payload?.data ||
      !Array.isArray(payload.data.employees)
    ) {
      return showNotFound();
    }

    renderEmployees(payload.data);
  } catch {
    if (version === requestVersion) showNotFound();
  } finally {
    if (version === requestVersion) appEl.removeAttribute("aria-busy");
  }
}

function handlePeriodClick(button, initData) {
  if (button.dataset.period === "all") {
    selectedMonths = new Set(QUARTER_MONTHS);
  } else {
    const month = Number(button.dataset.month);
    if (!QUARTER_MONTHS.includes(month)) return;

    if (isAllSelected()) {
      selectedMonths = new Set([month]);
    } else if (selectedMonths.has(month)) {
      if (selectedMonths.size === 1) return;
      selectedMonths.delete(month);
    } else {
      selectedMonths.add(month);
    }
  }

  syncPeriodButtons();
  loadAccruals(initData);
}

async function start() {
  showNotFound();

  const webApp = window.Telegram?.WebApp;
  const initData = webApp?.initData ?? "";
  if (!initData) return;

  webApp.ready();
  syncPeriodButtons();

  for (const button of periodButtons) {
    button.addEventListener("click", () => handlePeriodClick(button, initData));
  }

  await loadAccruals(initData);
}

start();
