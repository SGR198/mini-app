const labels={
  accruals:"Начисления",
  payments:"Выплаты",
  statement:"Ведомость",
  summary:"Общий баланс"
};

function icon(code){
  const paths={
    accruals:'<path d="M4 18h16M6 15V9m4 6V5m4 10v-7m4 7V3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    payments:'<path d="M4 7h16v10H4zM7 11h6M7 14h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    statement:'<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    summary:'<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${paths[code]||""}</svg>`;
}

export function renderTabs(section,onSection){
  const root=document.getElementById("tabs");
  root.innerHTML=Object.entries(labels).map(([code,label])=>
    `<button class="tab ${code===section?"active":""}" data-section="${code}">${icon(code)}<span>${label}</span></button>`
  ).join("");
  root.querySelectorAll("[data-section]").forEach((button)=>{
    button.onclick=()=>onSection(button.dataset.section);
  });
}
