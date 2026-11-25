// Synthetic planning dataset. No live price, timetable, weather feed or booking is implied.
const edge=(from,to,mode,km,hours,cost,wait=0)=>({from,to,mode,km,hours,cost,wait,maxKg:24000,maxM3:80,maxLm:13.6,chilled:mode==='road',adr:mode==='road'});
export const network=[
 edge('Plovdiv','Istanbul','road',420,9,540),edge('Plovdiv','Varna','road',370,7,430),
 edge('Istanbul','Tbilisi','road',1650,40,2050,12),edge('Varna','Poti','sea',1100,60,1600,18),
 edge('Poti','Tbilisi','road',310,8,420),edge('Poti','Tbilisi','rail',310,15,280,8),
 edge('Tbilisi','Alat','road',580,16,780,8),edge('Tbilisi','Alat','rail',580,24,480,10),
 edge('Alat','Kuryk','sea',420,22,1050,18),edge('Kuryk','Aktau','road',80,3,150),
 edge('Aktau','Almaty','rail',3100,78,1650,12),edge('Aktau','Almaty','road',2900,65,3400,4),
 edge('Alat','Turkmenbashi','sea',310,18,980,20)
];
export const origins=['Plovdiv','Varna'];export const destinations=['Almaty','Aktau','Turkmenbashi'];
export function compareRoutes(cargo,{scenario='normal',objective='balanced'}={}){
 if(!origins.includes(cargo.origin_name)||!destinations.includes(cargo.destination_name))throw new Error('unsupported_corridor');
 if(!['normal','wind','congestion'].includes(scenario)||!['balanced','cheapest','fastest'].includes(objective))throw new Error('invalid_planning_option');
 const candidates=[];
 function walk(node,legs,visited){
  if(node===cargo.destination_name){candidates.push(legs);return;}
  if(legs.length>=8)return;
  for(const e of network.filter(e=>e.from===node)){
   if(visited.has(e.to)||cargo.weight_kg>e.maxKg||cargo.volume_m3>e.maxM3||cargo.loading_m>e.maxLm||(cargo.hazardous&&!e.adr)||(cargo.temperature==='chilled'&&!e.chilled))continue;
   walk(e.to,[...legs,e],new Set([...visited,e.to]));
  }
 }
 walk(cargo.origin_name,[],new Set([cargo.origin_name]));
 const options=candidates.map((legs,index)=>{
  const share=Math.max(0.2,cargo.weight_kg/24000,cargo.volume_m3/80,cargo.loading_m/13.6);
  let eur=0,hours=0,km=0,transfers=0;
  const stages=legs.map((e,i)=>{const transfer=i>0 && legs[i-1].mode!==e.mode;const wait=e.wait+(e.mode==='sea'?(scenario==='wind'?36:scenario==='congestion'?24:0):scenario==='congestion'?6:0);
   const handling=transfer?8:0;transfers+=Number(transfer);const cost=Math.round(e.cost*share+(transfer?95:0));eur+=cost;hours+=e.hours+wait+handling;km+=e.km;return {...e,wait_hours:wait,handling_hours:handling,estimated_hours:e.hours+wait+handling,estimated_eur:cost};});
  const uncertainty=stages.filter(e=>e.mode==='sea').length*(scenario==='normal'?24:48)+12;
  return {id:`synthetic-${index+1}`,currency:'EUR',estimated_eur:eur,estimated_hours:hours,range_hours:[hours,hours+uncertainty],distance_km:km,transfers,load_share:Math.round(share*1000)/1000,stages,source:'synthetic_scenario',operator_confirmed:false,booking_available:false,delay_method:'scenario_buffer_not_statistical_prediction',assumptions:{scenario,truck_kg:24000,truck_m3:80,loading_m:13.6,minimum_share:0.2}};
 });
 const minCost=Math.min(...options.map(x=>x.estimated_eur)),minHours=Math.min(...options.map(x=>x.estimated_hours));
 for(const x of options)x.score=objective==='cheapest'?x.estimated_eur:objective==='fastest'?x.estimated_hours:(x.estimated_eur/minCost+x.estimated_hours/minHours)/2;
 return options.sort((a,b)=>a.score-b.score||a.estimated_eur-b.estimated_eur).slice(0,8);
}
export function consolidate(cargos,{maxKg=24000,maxM3=80,maxLm=13.6,windowDays=2}={}){
 const groups=[];
 for(const cargo of [...cargos].sort((a,b)=>b.weight_kg/maxKg+b.volume_m3/maxM3+b.loading_m/maxLm-(a.weight_kg/maxKg+a.volume_m3/maxM3+a.loading_m/maxLm))){
  if(cargo.weight_kg>maxKg||cargo.volume_m3>maxM3||cargo.loading_m>maxLm)throw new Error('cargo_exceeds_capacity');
  let group=groups.find(g=>g.origin===cargo.origin_name && g.destination===cargo.destination_name && g.temperature===cargo.temperature && g.hazardous===cargo.hazardous && Math.max(g.latest,Date.parse(cargo.pickup_date))-Math.min(g.earliest,Date.parse(cargo.pickup_date))<=windowDays*86400000 && g.weight_kg+cargo.weight_kg<=maxKg && g.volume_m3+cargo.volume_m3<=maxM3 && g.loading_m+cargo.loading_m<=maxLm);
  if(!group){group={origin:cargo.origin_name,destination:cargo.destination_name,temperature:cargo.temperature,hazardous:cargo.hazardous,earliest:Date.parse(cargo.pickup_date),latest:Date.parse(cargo.pickup_date),weight_kg:0,volume_m3:0,loading_m:0,cargo_ids:[]};groups.push(group);}
  group.weight_kg+=Number(cargo.weight_kg);group.volume_m3+=Number(cargo.volume_m3);group.loading_m+=Number(cargo.loading_m);group.cargo_ids.push(cargo.id);group.earliest=Math.min(group.earliest,Date.parse(cargo.pickup_date));group.latest=Math.max(group.latest,Date.parse(cargo.pickup_date));
 }
 return groups.map(g=>({...g,capacity:{kg:maxKg,m3:maxM3,loading_m:maxLm},utilization:Math.round(Math.max(g.weight_kg/maxKg,g.volume_m3/maxM3,g.loading_m/maxLm)*1000)/1000,method:'first_fit_decreasing_not_optimal',source:'synthetic_scenario'}));
}
export const integrationCapabilities=[
 {id:'ferry',kind:'sea',provider:'not_configured',state:'unavailable',booking:false,requirements:['operator_agreement','credentials','sandbox','signed_webhooks','idempotency']},
 {id:'rail',kind:'rail',provider:'not_configured',state:'unavailable',booking:false,requirements:['operator_agreement','terminal_identifiers','capacity_feed','sandbox']},
 {id:'customs',kind:'customs',provider:'not_configured',state:'unavailable',legal_document_issuance:false,requirements:['jurisdiction_validation','accredited_provider','credentials','sandbox']},
 {id:'weather',kind:'prediction',provider:'not_configured',state:'unavailable',forecast:false,requirements:['historical_data','current_feed','calibration','validation']}
];
