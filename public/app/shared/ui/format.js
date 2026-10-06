export const num=(value)=>Number(value)||0;

export const rub=(value)=>new Intl.NumberFormat("ru-RU",{
  style:"currency",
  currency:"RUB",
  maximumFractionDigits:2
}).format(num(value)).replace(",00","");

export const rubNumber=(value)=>new Intl.NumberFormat("ru-RU",{
  maximumFractionDigits:2
}).format(num(value));

export const esc=(value)=>String(value??"").replace(/[&<>"']/g,(char)=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[char]));

export const shortName=(value)=>{
  const parts=String(value||"").trim().split(/\s+/).filter(Boolean);
  if(parts.length<=1) return parts[0]||"Сотрудник";
  return `${parts[0]} ${parts.slice(1,3).map((x)=>(x[0]||"")+".").join("")}`;
};

export const monthNames=[
  "январь","февраль","март","апрель","май","июнь",
  "июль","август","сентябрь","октябрь","ноябрь","декабрь"
];

export const cap=(value)=>value?String(value).charAt(0).toUpperCase()+String(value).slice(1):"";

export function recordCountLabel(value) {
  const n=Math.abs(Math.trunc(num(value)));
  const n100=n%100;
  const n10=n%10;
  const word=n100>=11&&n100<=14?"записей":n10===1?"запись":n10>=2&&n10<=4?"записи":"записей";
  return `${n} ${word}`;
}

export function countWord(value,one,few,many){
  const n=Math.abs(Math.trunc(num(value)));
  const n100=n%100;
  const n10=n%10;
  return n100>=11&&n100<=14?many:n10===1?one:n10>=2&&n10<=4?few:many;
}

export const formatDate=(value)=>value
  ? new Date(value+"T00:00:00").toLocaleDateString("ru-RU")
  : "—";

export const formatStamp=(value)=>{
  const date=value?new Date(value):null;
  if(!date||Number.isNaN(date.valueOf())) return "";
  return date.toLocaleString("ru-RU",{
    timeZone:"Asia/Yekaterinburg",
    day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"
  }).replace(",","")+" ЕКБ";
};

export const signClass=(value)=>num(value)>0?"positive":num(value)<0?"negative":"neutral";
