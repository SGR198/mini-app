export const quarterOf=(month)=>Math.floor((Number(month)-1)/3)+1;

export function periodsForQuarter(periods,year,quarter){
  return periods
    .filter((p)=>Number(p.year)===Number(year)&&quarterOf(p.month)===Number(quarter))
    .sort((a,b)=>Number(a.month)-Number(b.month));
}

export function selectedPeriods(periods,ids){
  const set=new Set(ids.map(Number));
  return periods.filter((p)=>set.has(Number(p.id))).sort((a,b)=>
    Number(a.year)-Number(b.year)||Number(a.month)-Number(b.month)
  );
}

export function selectedDateRange(periods,ids){
  const rows=selectedPeriods(periods,ids);
  return {
    dateFrom:rows[0]?.period_start||null,
    dateTo:rows.at(-1)?.period_end||null
  };
}
