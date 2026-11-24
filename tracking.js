/* CASPIAN LOGISTICS tracking v0.3
 * Static GitHub Pages: synthetic demo events, isolated localStorage.
 * A private tracking API can be attached later using window.CASPIAN_TRACKING_API_BASE.
 * No credentials, partner access, or real positions are bundled here.
 */
const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = "caspian:tracking:v03:events";
const API_BASE = typeof window.CASPIAN_TRACKING_API_BASE === "string" ? window.CASPIAN_TRACKING_API_BASE.replace(/\/+$/, "") : ((["localhost","127.0.0.1"].includes(location.hostname) && location.port === "8787") ? location.origin : "");
const EVENT_TYPES = Object.freeze({
  registered:"Заявката е регистрирана",
  pickup_confirmed:"Товарът е приет от превозвач",
  terminal_in:"Влизане в терминал",
  rail_loaded:"Натоварен на железопътен състав",
  vessel_loaded:"Натоварен на ферибот",
  vessel_departed:"Отплаване",
  vessel_arrived:"Пристигане на ферибот",
  terminal_out:"Излизане от терминал",
  customs_cleared:"Митническо освобождаване",
  delivered:"Доставен на получател",
  delay_reported:"Съобщено забавяне"
});
const MODE_LABELS = Object.freeze({road:"АВТО",terminal:"ТЕРМИНАЛ",sea:"МОРЕ",rail:"ЖП",customs:"МИТНИЦИ"});
const STAGES = Object.freeze([
  {code:"pickup_confirmed",label:"Приемане",place:"България"},
  {code:"terminal_in",label:"Терминал",place:"Грузия"},
  {code:"vessel_departed",label:"Ферибот",place:"Каспийско море"},
  {code:"vessel_arrived",label:"Пристигане",place:"Казахстан"},
  {code:"customs_cleared",label:"Митница",place:"Казахстан"},
  {code:"delivered",label:"Доставка",place:"Получател"}
]);
const DAY = 86400000;
const now = Date.now();
function isoOffset(days) { return new Date(now + days * DAY).toISOString(); }
function makeEvent(id, type, place, mode, age, note) {
  return {event_id:id,type,location:place,mode,observed_at:isoOffset(age),recorded_at:isoOffset(age),note:note || "",source:"Демо сценарий",verified:false,demo:true};
}
const BASE = Object.freeze({
 "DEMO-0001": {
   reference:"DEMO-0001",container:"TGHU 7350084 (примерен)",origin:"Пловдив, България",destination:"Алмати, Казахстан",
   description:"Машинни компоненти · примерен групаж",eta:isoOffset(5),demo:true,
   events:[
    makeEvent("d1-1","registered","Пловдив, България","road",-4,"Примерна регистрация на товарна заявка."),
    makeEvent("d1-2","pickup_confirmed","Пловдив, България","road",-3.5,"Предадена за сухопътен превоз в демо сценарий."),
    makeEvent("d1-3","terminal_in","Поти, Грузия","terminal",-1.3,"Примерно приемане в терминал; не е операторско потвърждение.")
   ]
 },
 "DEMO-0002": {
   reference:"DEMO-0002",container:"MSKU 8350031 (примерен)",origin:"Варна, България",destination:"Алмати, Казахстан",
   description:"Промишлени стоки · примерен интермодален превоз",eta:isoOffset(2),demo:true,
   events:[
    makeEvent("d2-1","registered","Варна, България","road",-7,"Примерна заявка."),
    makeEvent("d2-2","pickup_confirmed","Варна, България","road",-6,"Примерен автомобилен транспорт."),
    makeEvent("d2-3","terminal_in","Баку / Алат, Азербайджан","terminal",-3,"Примерно влизане в терминала."),
    makeEvent("d2-4","vessel_loaded","Алат, Азербайджан","sea",-2.1,"Примерно натоварване на ферибот."),
    makeEvent("d2-5","vessel_departed","Алат, Азербайджан","sea",-1.7,"Примерно отплаване."),
    makeEvent("d2-6","delay_reported","Каспийско море","sea",-0.7,"Илюстративно предупреждение за закъснение; НЕ е реална прогноза.")
   ]
 }
});
function textNode(tag, value, className) {
  const el = document.createElement(tag);
  el.textContent = value == null ? "" : String(value);
  if(className) el.className = className;
  return el;
}
function safeString(value, length=180) { return String(value ?? "").trim().slice(0,length); }
function validateEvent(e) {
  return e && typeof e==="object" && EVENT_TYPES[e.type] &&
    typeof e.location==="string" && e.location.length>0 && e.location.length<=90 &&
    Number.isFinite(Date.parse(e.observed_at)) && typeof e.event_id==="string" && e.event_id.length<=80;
}
function readLocal() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if(!data || typeof data!=="object" || Array.isArray(data)) return {};
    const result={};
    for(const reference of Object.keys(BASE)) {
      result[reference] = Array.isArray(data[reference]) ? data[reference].filter(validateEvent).slice(0,120) : [];
    }
    return result;
  } catch { return {}; }
}
let local = readLocal();
let activeRef = "";
let subscription = null;
let subscribedRef = "";
function subscribeToEvents(ref) {
  if(!API_BASE || typeof EventSource === "undefined") return;
  if(subscribedRef===ref && subscription) return;
  if(subscription) subscription.close();
  subscribedRef=ref;
  subscription=new EventSource(API_BASE+"/api/shipments/"+encodeURIComponent(ref)+"/stream");
  subscription.addEventListener("milestone",()=>{if(activeRef===ref)search(ref);});
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(local)); return true; }
  catch { $("#event-feedback").textContent="Не е възможно локално запазване. Провери ограниченията на браузъра.";return false; }
}
function niceDate(value) {
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "Няма данни";
  return new Intl.DateTimeFormat("bg-BG",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Sofia"}).format(date);
}
function niceDay(value) {
  const date=new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("bg-BG",{day:"2-digit",month:"short",year:"numeric",timeZone:"Europe/Sofia"}).format(date);
}
function getLocalRecord(ref) {
  const base=BASE[ref];
  if(!base) return null;
  return { shipment:{reference:base.reference,container:base.container,origin:base.origin,destination:base.destination,description:base.description,eta:base.eta,demo:true}, events:[...base.events,...(local[ref] || [])]};
}
async function fetchRecord(ref) {
  if(!API_BASE)return getLocalRecord(ref);
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  try {
    const response=await fetch(API_BASE+"/api/shipments/"+encodeURIComponent(ref),{signal:controller.signal,credentials:"omit",headers:{"Accept":"application/json"}});
    if(response.status===404)return null;
    if(!response.ok)throw new Error("API HTTP "+response.status);
    const json=await response.json();
    if(!json || !json.shipment || !Array.isArray(json.events))throw new Error("Невалиден формат от API.");
    return json;
  } finally{clearTimeout(timeout);}
}
function normalizeEvents(events) {
  return events.filter(validateEvent).map(e=>({...e,type:safeString(e.type),location:safeString(e.location,90),mode:MODE_LABELS[e.mode]?e.mode:"terminal",note:safeString(e.note,180),source:safeString(e.source||"Неуточнен източник",90),verified:e.verified===true,demo:e.demo!==false})).sort((a,b)=> Date.parse(a.observed_at)-Date.parse(b.observed_at) || a.event_id.localeCompare(b.event_id));
}
function addSummary(label,value,small){}
function render(data) {
  const shipment=data.shipment,events=normalizeEvents(data.events),last=events.at(-1);
  const hasDelay=events.length>0 && last.type==="delay_reported";
  const latestOperational=[...events].reverse().find(e=>e.type!=="delay_reported") || last;
  $("#empty-result").hidden=true;
  $("#tracking-detail").hidden=false;
  $("#detail-ref").textContent=safeString(shipment.reference,50);
  $("#detail-description").textContent=safeString(shipment.description,180)+" · "+safeString(shipment.origin,90)+" → "+safeString(shipment.destination,90);
  $("#detail-state").textContent=hasDelay?"ЗАБАВЯНЕ · ДЕМО":(shipment.demo!==false?"ДЕМО ПРАТКА":"ДАННИ ОТ API");
  $("#detail-state").className="state"+(hasDelay?" warn":"");
  $("#detail-current").textContent=hasDelay?EVENT_TYPES.delay_reported:(latestOperational?EVENT_TYPES[latestOperational.type]:"Няма събития");
  $("#detail-current-location").textContent=last?safeString(last.location,90):"Няма местоположение";
  $("#detail-updated").textContent=last?niceDate(last.observed_at):"Няма данни";
  $("#detail-eta").textContent=niceDay(shipment.eta);
  $("#detail-source").textContent=last?safeString(last.source,90):"Няма събития";
  $("#detail-trust").textContent=last?(last.verified && !last.demo?"Потвърден операторски запис":"Непотвърдени демонстрационни данни"):"Няма източник";
  const progressCodes=new Set(events.filter(e=>e.type!=="delay_reported").map(e=>e.type));
  const completed=STAGES.reduce((n,s)=>n+(progressCodes.has(s.code)?1:0),0);
  $("#progress-text").textContent=completed+" / "+STAGES.length+" демонстрационни етапа";
  $("#progress-bar").style.width=(100*completed/STAGES.length)+"%";
  const steps=$("#route-steps");steps.replaceChildren();
  STAGES.forEach((s,i)=>{
    const item=textNode("div","","route-step"+(progressCodes.has(s.code)?" done":""));
    item.append(textNode("span",i+1,"circle"),textNode("strong",s.label),textNode("small",s.place));steps.append(item);
  });
  const delay=$("#delay-notice");
  delay.hidden=!hasDelay;
  if(hasDelay)delay.textContent="ВНИМАНИЕ: Последното демонстрационно събитие отчита забавяне. Това е симулация, а не потвърдено предупреждение от пристанище или ферибот.";
  $("#events-count").textContent=events.length+" СЪБИТИЯ";
  const timeline=$("#timeline");timeline.replaceChildren();
  if(!events.length)timeline.append(textNode("p","Няма регистрирани събития.","hint"));
  [...events].reverse().forEach(event=>{
    const item=textNode("article","","event"+(event.type==="delay_reported"?" delay-event":""));
    const meta=textNode("div","","event-meta");
    meta.append(textNode("span",niceDate(event.observed_at),"event-time"),textNode("span",MODE_LABELS[event.mode]||"ТЕРМИНАЛ","event-tag"));
    item.append(meta,textNode("strong",EVENT_TYPES[event.type]),textNode("div",event.location,"event-location"));
    if(event.note)item.append(textNode("div",event.note,"event-note"));
    const source=textNode("div","","event-source");
    source.append(textNode("span","Източник: "+event.source),textNode("span",event.verified && !event.demo?"✓ Проверен източник":"⚠ Непотвърдено","untrusted"));
    item.append(source);timeline.append(item);
  });
  $("#event-form").querySelector("button[type=submit]").disabled=Boolean(API_BASE);
  $("#event-feedback").textContent=API_BASE?"Свързан API режим: локалното симулиране е изключено.":"";
}
function showEmpty(message){
  $("#tracking-detail").hidden=true;
  const el=$("#empty-result");
  el.hidden=false;el.replaceChildren(textNode("strong","Няма резултат"),textNode("span",message));
}
async function search(reference) {
  const ref=safeString(reference,50).toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9-]{1,49}$/.test(ref)){showEmpty("Използвай 2–50 латински букви, цифри или тирета.");return;}
  $("#tracking-ref").value=ref;
  activeRef=ref;
  const oldRef=ref;
  $("#empty-result").hidden=false;
  $("#empty-result").textContent="Зареждане на проследяването…";
  $("#tracking-detail").hidden=true;
  try{
    const data=await fetchRecord(ref);
    if(activeRef!==oldRef)return;
    if(!data){showEmpty("Няма информация за този номер. За демо използвай DEMO-0001 или DEMO-0002.");return;}
    render(data);
    subscribeToEvents(ref);
    const url=new URL(location.href);url.searchParams.set("ref",ref);history.replaceState(null,"",url);
  }catch(err){if(activeRef===oldRef)showEmpty("Няма връзка със сървъра за проследяване. "+safeString(err.message,100));}
}
$("#search-form").addEventListener("submit",e=>{e.preventDefault();search($("#tracking-ref").value);});
document.querySelectorAll("[data-reference]").forEach(btn=>btn.addEventListener("click",()=>search(btn.dataset.reference)));
const selector=$("#event-type");
Object.entries(EVENT_TYPES).forEach(([code,label])=>{
  const option=document.createElement("option");option.value=code;option.textContent=label;selector.append(option);
});
selector.value="vessel_loaded";
$("#event-form").addEventListener("submit",e=>{
  e.preventDefault();
  if(API_BASE)return;
  if(!BASE[activeRef]){ $("#event-feedback").textContent="Избери демонстрационна пратка.";return; }
  const type=selector.value,locationValue=safeString($("#event-place").value,90),mode=$("#event-mode").value,note=safeString($("#event-note").value,180);
  if(!EVENT_TYPES[type] || !locationValue || locationValue.length>90 || !MODE_LABELS[mode])return;
  const event={event_id:"local-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),type,location:locationValue,mode,note,source:"Локален тест",observed_at:new Date().toISOString(),recorded_at:new Date().toISOString(),verified:false,demo:true};
  if(!Array.isArray(local[activeRef]))local[activeRef]=[];
  if(local[activeRef].length>=120){$("#event-feedback").textContent="Лимитът за локални събития е достигнат.";return;}
  local[activeRef].push(event);
  if(!persist()){local[activeRef].pop();return;}
  e.currentTarget.reset();selector.value="vessel_loaded";
  search(activeRef).then(()=>{$("#event-feedback").textContent="Събитието е записано в този браузър. Не е изпратено към оператор.";});
  window.dispatchEvent(new CustomEvent("caspian:tracking-event",{detail:{reference:activeRef,event_id:event.event_id}}));
});
$("#reset-demo").addEventListener("click",()=>{
  if(API_BASE)return;
  if(!window.confirm("Да изтрия ли само добавените локални демо събития?"))return;
  local={};persist();search(activeRef || "DEMO-0001");
});
$("#export-events").addEventListener("click",()=>{
  const data=getLocalRecord(activeRef);if(!data)return;
  const json=JSON.stringify({exported_at:new Date().toISOString(),mode:"DEMO",...data},null,2);
  const url=URL.createObjectURL(new Blob([json],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download="caspian-tracking-"+activeRef+".json";document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
window.addEventListener("storage",e=>{if(e.key===STORAGE_KEY){local=readLocal();if(activeRef)search(activeRef);}});
const initialRef=new URL(location.href).searchParams.get("ref") || "DEMO-0001";
search(initialRef);
