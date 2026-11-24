// CASPIAN LOGISTICS event ingestion API v0.3, Node.js 24+ (SQLite).
// Sandboxed, local-only by default; no external operator integrations.
import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdirSync, readFileSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const storage=resolve(process.env.TRACKING_DB_FILE||join(root,"tracking-api","data","tracking.db"));
mkdirSync(dirname(storage),{recursive:true});
const db=new DatabaseSync(storage);
db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;");
db.exec("CREATE TABLE IF NOT EXISTS shipments (reference TEXT PRIMARY KEY, container TEXT NOT NULL DEFAULT '', origin TEXT NOT NULL, destination TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', eta TEXT, demo INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)");
db.exec("CREATE TABLE IF NOT EXISTS events (event_id TEXT NOT NULL, reference TEXT NOT NULL REFERENCES shipments(reference), type TEXT NOT NULL, location TEXT NOT NULL, mode TEXT NOT NULL, observed_at TEXT NOT NULL, recorded_at TEXT NOT NULL, source TEXT NOT NULL, verified INTEGER NOT NULL DEFAULT 0, demo INTEGER NOT NULL DEFAULT 1, note TEXT NOT NULL DEFAULT '', PRIMARY KEY(reference,event_id))");
db.exec("CREATE INDEX IF NOT EXISTS events_by_reference ON events(reference,observed_at)");
const TYPES=new Set(["registered","pickup_confirmed","terminal_in","rail_loaded","vessel_loaded","vessel_departed","vessel_arrived","terminal_out","customs_cleared","delivered","delay_reported"]);
const MODES=new Set(["road","terminal","sea","rail","customs"]);
const PORT=Number(process.env.TRACKING_PORT||8787);
const HOST=process.env.TRACKING_HOST||"127.0.0.1";
const TOKEN=process.env.TRACKING_API_TOKEN||"";
const MAX_BODY=8192;
const streams=new Map();
const now=()=>new Date().toISOString();
const past=days=>new Date(Date.now()+days*86400000).toISOString();
const refOK=val=>{const str=String(val||"").trim().toUpperCase();return /^[A-Z0-9][A-Z0-9-]{1,49}$/.test(str)?str:null;};
const textOK=(s,max)=>typeof s==="string" && s.trim().length>0 && s.trim().length<=max;
const dateOK=s=>typeof s==="string" && s.length<=35 && /^\d{4}-\d{2}-\d{2}T/.test(s) && Number.isFinite(Date.parse(s));
const shipmentStmt=db.prepare("SELECT * FROM shipments WHERE reference=?");
const eventStmt=db.prepare("SELECT event_id,type,location,mode,observed_at,recorded_at,source,verified,demo,note FROM events WHERE reference=? ORDER BY observed_at,event_id");
const addShipment=db.prepare("INSERT OR IGNORE INTO shipments(reference,container,origin,destination,description,eta,demo,created_at) VALUES(?,?,?,?,?,?,?,?)");
const addEvent=db.prepare("INSERT OR IGNORE INTO events(event_id,reference,type,location,mode,observed_at,recorded_at,source,verified,demo,note) VALUES(?,?,?,?,?,?,?,?,?,?,?)");
function json(res,code,obj){const s=JSON.stringify(obj);res.writeHead(code,{"Content-Type":"application/json; charset=utf-8","Content-Length":Buffer.byteLength(s),"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});res.end(s);}
function authenticated(req){if(TOKEN.length<24)return false;const header=String(req.headers.authorization||"");if(!header.startsWith("Bearer "))return false;const a=Buffer.from(header.slice(7)),b=Buffer.from(TOKEN);return a.length===b.length && timingSafeEqual(a,b);}
async function readBody(req){let chunks=[],size=0;for await(const part of req){size+=part.length;if(size>MAX_BODY){const e=new Error("Payload too large");e.status=413;throw e;}chunks.push(part);}try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{const e=new Error("Invalid JSON");e.status=400;throw e;}}
function seed(){
  const examples=[
    ["DEMO-0001","Пловдив, България","Алмати, Казахстан","Машинни компоненти · демонстрация",5,[["registered","Пловдив, България","road",-4],["pickup_confirmed","Пловдив, България","road",-3.5],["terminal_in","Поти, Грузия","terminal",-1.3]]],
    ["DEMO-0002","Варна, България","Алмати, Казахстан","Промишлени стоки · демонстрация",2,[["registered","Варна, България","road",-7],["pickup_confirmed","Варна, България","road",-6],["terminal_in","Алат, Азербайджан","terminal",-3],["vessel_loaded","Алат, Азербайджан","sea",-2],["vessel_departed","Алат, Азербайджан","sea",-1.7],["delay_reported","Каспийско море","sea",-0.7]]]
  ];
  for(const [ref,origin,destination,desc,eta,milestones] of examples){
    if(shipmentStmt.get(ref))continue;
    addShipment.run(ref,"ПРИМЕРЕН",origin,destination,desc,past(eta),1,now());
    milestones.forEach(([type,place,mode,days],i)=>addEvent.run("seed-"+ref+"-"+i,ref,type,place,mode,past(days),now(),"Демо сценарий",0,1,"Синтетичен пример; не е операторско потвърждение."));
  }
}
seed();
function publish(reference,data){for(const client of streams.get(reference)||[]){try{client.write("event: milestone\ndata: "+JSON.stringify(data)+"\n\n");}catch{}}}
const staticPaths={"/":"tracking.html","/tracking.html":"tracking.html","/tracking.css":"tracking.css","/tracking.js":"tracking.js"};
function serveFile(path,res){
  if(!Object.hasOwn(staticPaths,path))return false;
  const ext=path.endsWith(".css")?"text/css":path.endsWith(".js")?"text/javascript":"text/html";
  try{const body=readFileSync(join(root,staticPaths[path]));res.writeHead(200,{"Content-Type":ext+"; charset=utf-8","Content-Length":body.length,"X-Content-Type-Options":"nosniff"});res.end(body);}catch{json(res,500,{error:"Static file unavailable"});}return true;
}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url||"/","http://127.0.0.1"),path=url.pathname;
  try{
    if(req.method==="GET" && path==="/api/health")return json(res,200,{status:"ok",mode:"local-demo",database:"sqlite",time:now()});
    const getMatch=path.match(/^\/api\/shipments\/([A-Za-z0-9-]{2,50})$/);
    if(req.method==="GET"&&getMatch){
      const ref=refOK(getMatch[1]),row=ref&&shipmentStmt.get(ref);
      if(!row)return json(res,404,{error:"Shipment not found"});
      return json(res,200,{shipment:{...row,demo:!!row.demo},events:eventStmt.all(ref).map(e=>({...e,demo:!!e.demo,verified:!!e.verified}))});
    }
    const sseMatch=path.match(/^\/api\/shipments\/([A-Za-z0-9-]{2,50})\/stream$/);
    if(req.method==="GET"&&sseMatch){
      const ref=refOK(sseMatch[1]);if(!ref||!shipmentStmt.get(ref))return json(res,404,{error:"Shipment not found"});
      res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-store","Connection":"keep-alive"});
      res.write("event: connected\ndata: "+JSON.stringify({reference:ref,demo:true})+"\n\n");
      if(!streams.has(ref))streams.set(ref,new Set());streams.get(ref).add(res);
      const ping=setInterval(()=>{try{res.write(": heartbeat\n\n");}catch{}},15000);
      req.on("close",()=>{clearInterval(ping);streams.get(ref)?.delete(res);});return;
    }
    if(req.method==="POST"&&(path==="/api/shipments"||path==="/api/events")){
      if(!authenticated(req))return json(res,401,{error:"Configure TRACKING_API_TOKEN (24+ characters) for authenticated writes"});
      const b=await readBody(req);
      if(!b||typeof b!=="object"||Array.isArray(b))return json(res,422,{error:"JSON object required"});
      const ref=refOK(b.reference);
      if(path==="/api/shipments"){
        if(!ref||!textOK(b.origin,90)||!textOK(b.destination,90)||(b.description!=null&&(!textOK(b.description,180)))||(b.eta!=null&&!dateOK(b.eta))||(b.container!=null&&(typeof b.container!=="string"||b.container.length>60)))return json(res,422,{error:"Invalid shipment"});
        const result=addShipment.run(ref,b.container||"",b.origin.trim(),b.destination.trim(),b.description||"",b.eta||null,1,now());
        return json(res,result.changes?201:409,{ok:!!result.changes,reference:ref,error:result.changes?null:"Shipment already exists"});
      }
      if(!ref||!shipmentStmt.get(ref))return json(res,404,{error:"Unknown shipment"});
      if(!textOK(b.event_id,80)||!TYPES.has(b.type)||!textOK(b.location,90)||!MODES.has(b.mode)||!dateOK(b.observed_at)||(b.note!=null&&(typeof b.note!=="string"||b.note.length>180)))return json(res,422,{error:"Invalid tracking event"});
      const result=addEvent.run(b.event_id,ref,b.type,b.location.trim(),b.mode,new Date(b.observed_at).toISOString(),now(),"Тестово API събитие",0,1,b.note||"");
      if(result.changes)publish(ref,{reference:ref,event_id:b.event_id,demo:true});
      return json(res,result.changes?201:200,{ok:true,idempotent:!result.changes,reference:ref});
    }
    if(req.method==="GET"&&serveFile(path,res))return;
    json(res,404,{error:"Not Found"});
  }catch(err){json(res,err.status||500,{error:err.status?err.message:"Server error"});}
});
server.listen(PORT,HOST,()=>console.log("CASPIAN TRACKING DEMO http://"+HOST+":"+server.address().port));
process.on("SIGINT",()=>server.close(()=>{db.close();process.exit(0);}));
process.on("SIGTERM",()=>server.close(()=>{db.close();process.exit(0);}));
