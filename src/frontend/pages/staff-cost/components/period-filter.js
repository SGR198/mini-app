import { cap, monthNames } from "../../shared/ui/format.js";
import { periodsForQuarter } from "../../shared/ui/periods.js";

export function renderPeriodFilter({
  periods,year,quarter,periodIds,onYear,onQuarter,onMonth,onQuarterAll
}){
  const years=[...new Set(periods.map((p)=>Number(p.year)))].sort((a,b)=>a-b);
  const quarterRows=periodsForQuarter(periods,year,quarter);
  const selected=new Set(periodIds.map(Number));

  document.getElementById("years").innerHTML=years.map((value)=>
    `<button class="selector year ${value===Number(year)?"active":""}" data-year="${value}">${String(value).slice(-2)}</button>`
  ).join("");

  document.getElementById("quarters").innerHTML=[1,2,3,4].map((value)=>
    `<button class="selector quarter ${value===Number(quarter)?"active":""}" data-quarter="${value}">${["I","II","III","IV"][value-1]} кв.</button>`
  ).join("");

  const allActive=quarterRows.length>0&&quarterRows.every((p)=>selected.has(Number(p.id)));
  document.getElementById("months").innerHTML=
    `<button class="selector all ${allActive?"active":""}" data-all="1" ${quarterRows.length?"":"disabled"}>Все</button>`
    +quarterRows.map((p)=>
      `<button class="selector month ${selected.has(Number(p.id))?"active":""}" data-period="${p.id}">${cap(monthNames[Number(p.month)-1])}</button>`
    ).join("");

  document.querySelectorAll("[data-year]").forEach((button)=>{
    button.onclick=()=>onYear(Number(button.dataset.year));
  });
  document.querySelectorAll("[data-quarter]").forEach((button)=>{
    button.onclick=()=>onQuarter(Number(button.dataset.quarter));
  });
  document.querySelectorAll("[data-period]").forEach((button)=>{
    button.onclick=()=>onMonth(Number(button.dataset.period));
  });
  document.querySelector("[data-all]")?.addEventListener("click",onQuarterAll);
}
