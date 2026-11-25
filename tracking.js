/* CASPIAN LOGISTICS tracking v0.3
 * Static GitHub Pages: synthetic demo events, isolated localStorage.
 * A private tracking API can be attached later using window.CASPIAN_TRACKING_API_BASE.
 * No credentials, partner access, or real positions are bundled here.
 */
const $ = (selector) => document.querySelector(selector);
const DICTIONARY = {
  "РАБОТНО ПРОСТРАНСТВО": {
    "en": "WORKSPACE",
    "zh": "工作空间"
  },
  "Главно табло": {
    "en": "Dashboard",
    "zh": "主控制台"
  },
  "Борса за товари": {
    "en": "Freight exchange",
    "zh": "货运交易平台"
  },
  "Проследяване": {
    "en": "Tracking",
    "zh": "货物追踪"
  },
  "по етапи.": {
    "en": "by milestone.",
    "zh": "按运输节点。"
  },
  "Събития по етапи · Демо/локален режим · Без GPS API": {
    "en": "Milestones · Demo/local mode · No GPS API",
    "zh": "运输节点 · 演示/本地模式 · 无 GPS API"
  },
  "Събития от транспортната верига — терминали, фериботи, ЖП оператори и автомобилни превозвачи.": {
    "en": "Transport milestones from terminals, ferries, rail and road carriers.",
    "zh": "运输链节点：货运站、渡轮、铁路及公路承运商。"
  },
  "Демонстрационна система.": {
    "en": "Demonstration system.",
    "zh": "演示系统。"
  },
  "Няма реални пратки, GPS данни, връзка към пристанища или потвърдени операторски съобщения. Всички примерни събития са синтетични.": {
    "en": "No real shipments, GPS data, port connections or verified operator messages. All sample events are synthetic.",
    "zh": "无真实货物、GPS 数据、港口连接或经核实的运营商消息。所有示例事件均为模拟数据。"
  },
  "НОМЕР НА ПРАТКА / КОНТЕЙНЕР": {
    "en": "SHIPMENT / CONTAINER NUMBER",
    "zh": "货物 / 集装箱编号"
  },
  "Например DEMO-0001": {
    "en": "For example DEMO-0001",
    "zh": "例如 DEMO-0001"
  },
  "Проследи пратка": {
    "en": "Track shipment",
    "zh": "追踪货物"
  },
  "Примерни номера:": {
    "en": "Sample references:",
    "zh": "示例编号："
  },
  "Нулирай демо събития": {
    "en": "Reset demo events",
    "zh": "重置演示事件"
  },
  "ДЕМО": {
    "en": "DEMO",
    "zh": "演示"
  },
  "ТЕКУЩ ЕТАП": {
    "en": "CURRENT MILESTONE",
    "zh": "当前运输节点"
  },
  "ПОСЛЕДНО СЪБИТИЕ": {
    "en": "LATEST EVENT",
    "zh": "最新事件"
  },
  "От регистъра на събитията": {
    "en": "From the event log",
    "zh": "来自事件记录"
  },
  "ПРИМЕРНА ETA": {
    "en": "SAMPLE ETA",
    "zh": "示例预计到达时间"
  },
  "Не е потвърдена от оператор": {
    "en": "Not confirmed by an operator",
    "zh": "未经运营商确认"
  },
  "ПРОИЗХОД НА ДАННИТЕ": {
    "en": "DATA SOURCE",
    "zh": "数据来源"
  },
  "Логистична верига": {
    "en": "Transport chain",
    "zh": "物流链"
  },
  "Хронология на пратката": {
    "en": "Shipment timeline",
    "zh": "货物事件时间线"
  },
  "Симулирай събитие": {
    "en": "Simulate an event",
    "zh": "模拟事件"
  },
  "Тук можеш да тестваш нови логистични статути. Записват се само в твоя браузър, без да се изпращат на оператори.": {
    "en": "Test logistics statuses here. They are saved only in this browser, never sent to operators.",
    "zh": "在此测试物流状态。数据仅保存在当前浏览器中，不会发送给运营商。"
  },
  "ТИП НА СЪБИТИЕ": {
    "en": "EVENT TYPE",
    "zh": "事件类型"
  },
  "ЛОКАЦИЯ": {
    "en": "LOCATION",
    "zh": "地点"
  },
  "Например пристанище Алат": {
    "en": "For example Alat port",
    "zh": "例如阿拉特港"
  },
  "ТРАНСПОРТ": {
    "en": "TRANSPORT MODE",
    "zh": "运输方式"
  },
  "Автомобилен": {
    "en": "Road",
    "zh": "公路"
  },
  "Терминал": {
    "en": "Terminal",
    "zh": "货运站"
  },
  "Морски": {
    "en": "Sea",
    "zh": "海运"
  },
  "Железопътен": {
    "en": "Rail",
    "zh": "铁路"
  },
  "Митници": {
    "en": "Customs",
    "zh": "海关"
  },
  "ДОПЪЛНИТЕЛНА БЕЛЕЖКА": {
    "en": "ADDITIONAL NOTE",
    "zh": "附加备注"
  },
  "По избор": {
    "en": "Optional",
    "zh": "选填"
  },
  "+ Добави демо събитие": {
    "en": "+ Add demo event",
    "zh": "+ 添加演示事件"
  },
  "Достоверност": {
    "en": "Data reliability",
    "zh": "数据可信度"
  },
  "Демо сценарий": {
    "en": "Demo scenario",
    "zh": "演示场景"
  },
  "Непотвърден": {
    "en": "Unverified",
    "zh": "未经核实"
  },
  "Локален тест": {
    "en": "Local test",
    "zh": "本地测试"
  },
  "Оператор / TOS / GPS": {
    "en": "Operator / TOS / GPS",
    "zh": "运营商 / TOS / GPS"
  },
  "Не е свързан": {
    "en": "Not connected",
    "zh": "未连接"
  },
  "Експорт на хронология (JSON) ↧": {
    "en": "Export timeline (JSON) ↧",
    "zh": "导出时间线 (JSON) ↧"
  },
  "CASPIAN LOGISTICS · ПРОЕКТ 2 · TRACKING MODULE v0.3": {
    "en": "CASPIAN LOGISTICS · PROJECT 2 · TRACKING MODULE v0.3",
    "zh": "CASPIAN LOGISTICS · 项目 2 · 追踪模块 v0.3"
  },
  "Само демонстрация, без реални операторски интеграции.": {
    "en": "Demo only, no live operator integrations.",
    "zh": "仅供演示，未连接真实运营商。"
  },
  "Заявката е регистрирана": {
    "en": "Request registered",
    "zh": "运输请求已登记"
  },
  "Товарът е приет от превозвач": {
    "en": "Cargo accepted by carrier",
    "zh": "承运商已接收货物"
  },
  "Влизане в терминал": {
    "en": "Terminal arrival",
    "zh": "进入货运站"
  },
  "Натоварен на железопътен състав": {
    "en": "Loaded onto train",
    "zh": "已装载至列车"
  },
  "Натоварен на ферибот": {
    "en": "Loaded onto ferry",
    "zh": "已装载至渡轮"
  },
  "Отплаване": {
    "en": "Vessel departure",
    "zh": "船舶已出发"
  },
  "Пристигане на ферибот": {
    "en": "Ferry arrival",
    "zh": "渡轮已到达"
  },
  "Излизане от терминал": {
    "en": "Terminal departure",
    "zh": "离开货运站"
  },
  "Митническо освобождаване": {
    "en": "Customs clearance",
    "zh": "海关放行"
  },
  "Доставен на получател": {
    "en": "Delivered to consignee",
    "zh": "已交付收货人"
  },
  "Съобщено забавяне": {
    "en": "Delay reported",
    "zh": "已报告延误"
  },
  "АВТО": {
    "en": "ROAD",
    "zh": "公路"
  },
  "ТЕРМИНАЛ": {
    "en": "TERMINAL",
    "zh": "货运站"
  },
  "МОРЕ": {
    "en": "SEA",
    "zh": "海运"
  },
  "ЖП": {
    "en": "RAIL",
    "zh": "铁路"
  },
  "МИТНИЦИ": {
    "en": "CUSTOMS",
    "zh": "海关"
  },
  "Приемане": {
    "en": "Pickup",
    "zh": "提货"
  },
  "Ферибот": {
    "en": "Ferry",
    "zh": "渡轮"
  },
  "Пристигане": {
    "en": "Arrival",
    "zh": "到达"
  },
  "Митница": {
    "en": "Customs",
    "zh": "海关"
  },
  "Доставка": {
    "en": "Delivery",
    "zh": "交付"
  },
  "България": {
    "en": "Bulgaria",
    "zh": "保加利亚"
  },
  "Грузия": {
    "en": "Georgia",
    "zh": "格鲁吉亚"
  },
  "Каспийско море": {
    "en": "Caspian Sea",
    "zh": "里海"
  },
  "Казахстан": {
    "en": "Kazakhstan",
    "zh": "哈萨克斯坦"
  },
  "Получател": {
    "en": "Consignee",
    "zh": "收货人"
  },
  "Не е възможно локално запазване. Провери ограниченията на браузъра.": {
    "en": "Unable to save locally. Check browser settings.",
    "zh": "无法在本地保存，请检查浏览器设置。"
  },
  "Няма данни": {
    "en": "No data",
    "zh": "无数据"
  },
  "Невалиден формат от API.": {
    "en": "Invalid API response format.",
    "zh": "API 响应格式无效。"
  },
  "Неуточнен източник": {
    "en": "Unknown source",
    "zh": "未知来源"
  },
  "ЗАБАВЯНЕ · ДЕМО": {
    "en": "DELAY · DEMO",
    "zh": "延误 · 演示"
  },
  "ДЕМО ПРАТКА": {
    "en": "DEMO SHIPMENT",
    "zh": "演示货物"
  },
  "ДАННИ ОТ API": {
    "en": "API DATA",
    "zh": "API 数据"
  },
  "Няма събития": {
    "en": "No events",
    "zh": "无事件"
  },
  "Няма местоположение": {
    "en": "No location",
    "zh": "无位置信息"
  },
  "Потвърден операторски запис": {
    "en": "Verified operator record",
    "zh": "经核实的运营商记录"
  },
  "Непотвърдени демонстрационни данни": {
    "en": "Unverified demo data",
    "zh": "未经核实的演示数据"
  },
  "Няма източник": {
    "en": "No source",
    "zh": "无来源"
  },
  "демонстрационни етапа": {
    "en": "demo milestones",
    "zh": "演示节点"
  },
  "ВНИМАНИЕ: Последното демонстрационно събитие отчита забавяне. Това е симулация, а не потвърдено предупреждение от пристанище или ферибот.": {
    "en": "NOTICE: The latest demo event reports a delay. This is a simulation, not a confirmed port or ferry warning.",
    "zh": "注意：最新演示事件显示延误。这是模拟，并非港口或渡轮的已确认通知。"
  },
  "СЪБИТИЯ": {
    "en": "EVENTS",
    "zh": "事件"
  },
  "Няма регистрирани събития.": {
    "en": "No recorded events.",
    "zh": "暂无记录事件。"
  },
  "Източник:": {
    "en": "Source:",
    "zh": "来源："
  },
  "✓ Проверен източник": {
    "en": "✓ Verified source",
    "zh": "✓ 已核实来源"
  },
  "⚠ Непотвърдено": {
    "en": "⚠ Unverified",
    "zh": "⚠ 未经核实"
  },
  "Свързан API режим: локалното симулиране е изключено.": {
    "en": "Connected API mode: local simulation is disabled.",
    "zh": "API 已连接：本地模拟已禁用。"
  },
  "Няма резултат": {
    "en": "No result",
    "zh": "无结果"
  },
  "Използвай 2–50 латински букви, цифри или тирета.": {
    "en": "Use 2–50 Latin letters, digits or hyphens.",
    "zh": "请输入 2–50 个拉丁字母、数字或连字符。"
  },
  "Зареждане на проследяването…": {
    "en": "Loading tracking…",
    "zh": "正在加载追踪信息…"
  },
  "Няма информация за този номер. За демо използвай DEMO-0001 или DEMO-0002.": {
    "en": "No information for this reference. Try DEMO-0001 or DEMO-0002.",
    "zh": "未找到该编号。请尝试 DEMO-0001 或 DEMO-0002。"
  },
  "Няма връзка със сървъра за проследяване.": {
    "en": "Unable to connect to the tracking server.",
    "zh": "无法连接追踪服务器。"
  },
  "Избери демонстрационна пратка.": {
    "en": "Select a demo shipment.",
    "zh": "请选择演示货物。"
  },
  "Лимитът за локални събития е достигнат.": {
    "en": "Local event limit reached.",
    "zh": "已达到本地事件数量上限。"
  },
  "Събитието е записано в този браузър. Не е изпратено към оператор.": {
    "en": "Event saved in this browser. It was not sent to an operator.",
    "zh": "事件已保存在此浏览器中，未发送给运营商。"
  },
  "Да изтрия ли само добавените локални демо събития?": {
    "en": "Delete only the added local demo events?",
    "zh": "是否仅删除添加的本地演示事件？"
  },
  "Пловдив, България": {
    "en": "Plovdiv, Bulgaria",
    "zh": "普罗夫迪夫，保加利亚"
  },
  "Алмати, Казахстан": {
    "en": "Almaty, Kazakhstan",
    "zh": "阿拉木图，哈萨克斯坦"
  },
  "Поти, Грузия": {
    "en": "Poti, Georgia",
    "zh": "波季，格鲁吉亚"
  },
  "Варна, България": {
    "en": "Varna, Bulgaria",
    "zh": "瓦尔纳，保加利亚"
  },
  "Баку / Алат, Азербайджан": {
    "en": "Baku / Alat, Azerbaijan",
    "zh": "巴库 / 阿拉特，阿塞拜疆"
  },
  "Алат, Азербайджан": {
    "en": "Alat, Azerbaijan",
    "zh": "阿拉特，阿塞拜疆"
  },
  "Машинни компоненти · примерен групаж": {
    "en": "Machine components · sample groupage",
    "zh": "机械零部件 · 拼货运输示例"
  },
  "Промишлени стоки · примерен интермодален превоз": {
    "en": "Industrial goods · sample intermodal transport",
    "zh": "工业品 · 多式联运示例"
  },
  "Примерна регистрация на товарна заявка.": {
    "en": "Sample freight request registration.",
    "zh": "货运请求登记示例。"
  },
  "Предадена за сухопътен превоз в демо сценарий.": {
    "en": "Handed over for inland transport in demo scenario.",
    "zh": "演示场景中已交付陆运。"
  },
  "Примерно приемане в терминал; не е операторско потвърждение.": {
    "en": "Sample terminal reception; not operator-confirmed.",
    "zh": "货运站接收示例，未经运营商确认。"
  },
  "Примерна заявка.": {
    "en": "Sample request.",
    "zh": "示例请求。"
  },
  "Примерен автомобилен транспорт.": {
    "en": "Sample road transport.",
    "zh": "公路运输示例。"
  },
  "Примерно влизане в терминала.": {
    "en": "Sample terminal arrival.",
    "zh": "进入货运站示例。"
  },
  "Примерно натоварване на ферибот.": {
    "en": "Sample ferry loading.",
    "zh": "渡轮装载示例。"
  },
  "Примерно отплаване.": {
    "en": "Sample vessel departure.",
    "zh": "船舶出发示例。"
  },
  "Илюстративно предупреждение за закъснение; НЕ е реална прогноза.": {
    "en": "Illustrative delay alert; NOT a real forecast.",
    "zh": "延误提示示例，并非真实预测。"
  },
  "Тестово API събитие": {
    "en": "Test API event",
    "zh": "API 测试事件"
  },
  "Машинни компоненти · демонстрация": {
    "en": "Machine components · demo",
    "zh": "机械零部件 · 演示"
  },
  "Промишлени стоки · демонстрация": {
    "en": "Industrial goods · demo",
    "zh": "工业品 · 演示"
  },
  "CASPIAN LOGISTICS — начало": {
    "en": "CASPIAN LOGISTICS — home",
    "zh": "CASPIAN LOGISTICS — 首页"
  }
};
let rememberedLanguage="bg";try{rememberedLanguage=localStorage.getItem("caspian_demo_language")||"bg"}catch{}
const requestedLanguage=(new URL(location.href).searchParams.get("lang")||rememberedLanguage).toLowerCase();
const lang=["bg","en","zh"].includes(requestedLanguage)?requestedLanguage:"bg";
const locale={bg:"bg-BG",en:"en-GB",zh:"zh-CN"}[lang];
const t=value=>DICTIONARY[value]?.[lang]??value;
document.documentElement.lang=lang==="zh"?"zh-CN":lang;document.title=({bg:"Проследяване по етапи",en:"Milestone Tracking",zh:"运输节点追踪"})[lang]+" | CASPIAN LOGISTICS";
try{localStorage.setItem("caspian_demo_language",lang)}catch{}
const footer=document.querySelector("footer");if(lang!=="bg")footer.textContent=lang==="en"?"CASPIAN LOGISTICS · PROJECT 2 · TRACKING MODULE v0.3 | Demo only, no live operator integrations.":"CASPIAN LOGISTICS · 项目 2 · 追踪模块 v0.3 | 仅供演示，未连接真实运营商。";
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
while(walker.nextNode()){const node=walker.currentNode,raw=node.nodeValue,key=raw.trim();if(key&&Object.hasOwn(DICTIONARY,key))node.nodeValue=raw.replace(key,t(key))}
for(const el of document.querySelectorAll("[placeholder],[aria-label]"))for(const attr of ["placeholder","aria-label"])if(el.hasAttribute(attr))el.setAttribute(attr,t(el.getAttribute(attr)));
const langSelect=document.querySelector("#tracking-language");langSelect.value=lang;langSelect.setAttribute("aria-label",({bg:"Език",en:"Language",zh:"语言"})[lang]);
langSelect.addEventListener("change",()=>{const u=new URL(location.href);u.searchParams.set("lang",langSelect.value);location.href=u.toString()});
for(const a of document.querySelectorAll("a[href]")){const u=new URL(a.href);if(u.origin===location.origin){u.searchParams.set("lang",lang);a.href=u.toString()}}

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
let displayedRecord = null;
let searchGeneration = 0;
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
  catch { $("#event-feedback").textContent=t("Не е възможно локално запазване. Провери ограниченията на браузъра.");return false; }
}
function niceDate(value) {
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return t("Няма данни");
  return new Intl.DateTimeFormat(locale,{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Sofia"}).format(date);
}
function niceDay(value) {
  const date=new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(locale,{day:"2-digit",month:"short",year:"numeric",timeZone:"Europe/Sofia"}).format(date);
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
  displayedRecord={shipment:{...shipment},events};
  $("#export-events").disabled=false;
  const hasDelay=events.length>0 && last.type==="delay_reported";
  const latestOperational=[...events].reverse().find(e=>e.type!=="delay_reported") || last;
  $("#empty-result").hidden=true;
  $("#tracking-detail").hidden=false;
  $("#detail-ref").textContent=safeString(shipment.reference,50);
  $("#detail-description").textContent=t(safeString(shipment.description,180))+" · "+t(safeString(shipment.origin,90))+" → "+t(safeString(shipment.destination,90));
  $("#detail-state").textContent=hasDelay?t("ЗАБАВЯНЕ · ДЕМО"):(shipment.demo!==false?t("ДЕМО ПРАТКА"):t("ДАННИ ОТ API"));
  $("#detail-state").className="state"+(hasDelay?" warn":"");
  $("#detail-current").textContent=hasDelay?t(EVENT_TYPES.delay_reported):(latestOperational?t(EVENT_TYPES[latestOperational.type]):t("Няма събития"));
  $("#detail-current-location").textContent=last?t(safeString(last.location,90)):t("Няма местоположение");
  $("#detail-updated").textContent=last?niceDate(last.observed_at):t("Няма данни");
  $("#detail-eta").textContent=niceDay(shipment.eta);
  $("#detail-source").textContent=last?t(safeString(last.source,90)):t("Няма събития");
  $("#detail-trust").textContent=last?(last.verified && !last.demo?t("Потвърден операторски запис"):t("Непотвърдени демонстрационни данни")):t("Няма източник");
  const progressCodes=new Set(events.filter(e=>e.type!=="delay_reported").map(e=>e.type));
  const completed=STAGES.reduce((n,s)=>n+(progressCodes.has(s.code)?1:0),0);
  $("#progress-text").textContent=completed+" / "+STAGES.length+" "+t("демонстрационни етапа");
  $("#progress-bar").style.width=(100*completed/STAGES.length)+"%";
  const steps=$("#route-steps");steps.replaceChildren();
  STAGES.forEach((s,i)=>{
    const item=textNode("div","","route-step"+(progressCodes.has(s.code)?" done":""));
    item.append(textNode("span",i+1,"circle"),textNode("strong",t(s.label)),textNode("small",t(s.place)));steps.append(item);
  });
  const delay=$("#delay-notice");
  delay.hidden=!hasDelay;
  if(hasDelay)delay.textContent=t("ВНИМАНИЕ: Последното демонстрационно събитие отчита забавяне. Това е симулация, а не потвърдено предупреждение от пристанище или ферибот.");
  $("#events-count").textContent=events.length+" "+t("СЪБИТИЯ");
  const timeline=$("#timeline");timeline.replaceChildren();
  if(!events.length)timeline.append(textNode("p",t("Няма регистрирани събития."),"hint"));
  [...events].reverse().forEach(event=>{
    const item=textNode("article","","event"+(event.type==="delay_reported"?" delay-event":""));
    const meta=textNode("div","","event-meta");
    meta.append(textNode("span",niceDate(event.observed_at),"event-time"),textNode("span",t(MODE_LABELS[event.mode]||"ТЕРМИНАЛ"),"event-tag"));
    item.append(meta,textNode("strong",t(EVENT_TYPES[event.type])),textNode("div",t(event.location),"event-location"));
    if(event.note)item.append(textNode("div",t(event.note),"event-note"));
    const source=textNode("div","","event-source");
    source.append(textNode("span",t("Източник:")+" "+t(event.source)),textNode("span",event.verified && !event.demo?t("✓ Проверен източник"):t("⚠ Непотвърдено"),"untrusted"));
    item.append(source);timeline.append(item);
  });
  $("#event-form").querySelector("button[type=submit]").disabled=Boolean(API_BASE);
  $("#event-feedback").textContent=API_BASE?t("Свързан API режим: локалното симулиране е изключено."):"";
}
function showEmpty(message){
  displayedRecord=null;
  $("#export-events").disabled=true;
  $("#tracking-detail").hidden=true;
  const el=$("#empty-result");
  el.hidden=false;el.replaceChildren(textNode("strong",t("Няма резултат")),textNode("span",message));
}
async function search(reference) {
  const generation=++searchGeneration;
  displayedRecord=null;
  $("#export-events").disabled=true;
  const ref=safeString(reference,50).toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9-]{1,49}$/.test(ref)){activeRef="";if(subscription){subscription.close();subscription=null;subscribedRef="";}showEmpty(t("Използвай 2–50 латински букви, цифри или тирета."));return;}
  $("#tracking-ref").value=ref;
  activeRef=ref;
  const oldRef=ref;
  $("#empty-result").hidden=false;
  $("#empty-result").textContent=t("Зареждане на проследяването…");
  $("#tracking-detail").hidden=true;
  try{
    const data=await fetchRecord(ref);
    if(generation!==searchGeneration || activeRef!==oldRef)return;
    if(!data){showEmpty(t("Няма информация за този номер. За демо използвай DEMO-0001 или DEMO-0002."));return;}
    render(data);
    subscribeToEvents(ref);
    const url=new URL(location.href);url.searchParams.set("ref",ref);history.replaceState(null,"",url);
  }catch(err){if(generation===searchGeneration && activeRef===oldRef)showEmpty(t("Няма връзка със сървъра за проследяване.")+" "+safeString(err.message,100));}
}
$("#search-form").addEventListener("submit",e=>{e.preventDefault();search($("#tracking-ref").value);});
document.querySelectorAll("[data-reference]").forEach(btn=>btn.addEventListener("click",()=>search(btn.dataset.reference)));
const selector=$("#event-type");
Object.entries(EVENT_TYPES).forEach(([code,label])=>{
  const option=document.createElement("option");option.value=code;option.textContent=t(label);selector.append(option);
});
selector.value="vessel_loaded";
$("#event-form").addEventListener("submit",e=>{
  e.preventDefault();
  if(API_BASE)return;
  if(!BASE[activeRef]){ $("#event-feedback").textContent=t("Избери демонстрационна пратка.");return; }
  const type=selector.value,locationValue=safeString($("#event-place").value,90),mode=$("#event-mode").value,note=safeString($("#event-note").value,180);
  if(!EVENT_TYPES[type] || !locationValue || locationValue.length>90 || !MODE_LABELS[mode])return;
  const event={event_id:"local-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),type,location:locationValue,mode,note,source:"Локален тест",observed_at:new Date().toISOString(),recorded_at:new Date().toISOString(),verified:false,demo:true};
  if(!Array.isArray(local[activeRef]))local[activeRef]=[];
  if(local[activeRef].length>=120){$("#event-feedback").textContent=t("Лимитът за локални събития е достигнат.");return;}
  local[activeRef].push(event);
  if(!persist()){local[activeRef].pop();return;}
  e.currentTarget.reset();selector.value="vessel_loaded";
  search(activeRef).then(()=>{$("#event-feedback").textContent=t("Събитието е записано в този браузър. Не е изпратено към оператор.");});
  window.dispatchEvent(new CustomEvent("caspian:tracking-event",{detail:{reference:activeRef,event_id:event.event_id}}));
});
$("#reset-demo").addEventListener("click",()=>{
  if(API_BASE)return;
  if(!window.confirm(t("Да изтрия ли само добавените локални демо събития?")))return;
  local={};persist();search(activeRef || "DEMO-0001");
});
$("#export-events").addEventListener("click",()=>{
  const data=displayedRecord;if(!data)return;
  const json=JSON.stringify({exported_at:new Date().toISOString(),mode:API_BASE?"API":"DEMO",...data},null,2);
  const url=URL.createObjectURL(new Blob([json],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download="caspian-tracking-"+safeString(data.shipment.reference,50)+".json";document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
window.addEventListener("storage",e=>{if(e.key===STORAGE_KEY){local=readLocal();if(activeRef)search(activeRef);}});
const initialRef=new URL(location.href).searchParams.get("ref") || "DEMO-0001";
search(initialRef);
