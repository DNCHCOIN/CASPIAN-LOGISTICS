import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
const folder=mkdtempSync(join(tmpdir(),"caspian-track-"));
const token=randomBytes(32).toString("hex");
const proc=spawn(process.execPath,[fileURLToPath(new URL("./server.mjs",import.meta.url))],{
 env:{...process.env,TRACKING_HOST:"127.0.0.1",TRACKING_PORT:"0",TRACKING_DB_FILE:join(folder,"test.db"),TRACKING_API_TOKEN:token},
 stdio:["ignore","pipe","pipe"]
});
let output="";
const base=await new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>reject(new Error("API startup timeout: "+output)),10000);
 proc.once("error",err=>{clearTimeout(timer);reject(err);});
 proc.once("exit",code=>{clearTimeout(timer);reject(new Error("API exited "+code+" "+output));});
 proc.stdout.on("data",chunk=>{
   output+=chunk.toString();
   const match=output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
   if(match){clearTimeout(timer);resolve("http://127.0.0.1:"+match[1]);}
 });
 proc.stderr.on("data",chunk=>{output+=chunk.toString();});
});
after(async()=>{proc.kill("SIGTERM");rmSync(folder,{recursive:true,force:true});});
async function get(path){return fetch(base+path);}
async function post(path,data,authenticated=true){
 return fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json",...(authenticated?{Authorization:"Bearer "+token}:{})},body:JSON.stringify(data)});
}
test("health endpoint and localhost binding",async()=>{
 const response=await get("/api/health");
 assert.equal(response.status,200);
 const data=await response.json();assert.equal(data.status,"ok");assert.equal(data.database,"sqlite");
});
test("seeded milestones are DEMO and unverified",async()=>{
 const response=await get("/api/shipments/DEMO-0001");
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.shipment.demo,true);assert.equal(data.events.length,3);
 assert.ok(data.events.every(e=>e.verified===false && e.demo===true));
});
test("unknown shipment is 404",async()=>assert.equal((await get("/api/shipments/UNKNOWN-777")).status,404));
test("writes require a bearer token",async()=>{
 const response=await post("/api/events",{reference:"DEMO-0001"},false);
 assert.equal(response.status,401);
});
test("event ingestion is idempotent and attributable",async()=>{
 const data={reference:"DEMO-0001",event_id:"terminal-test-123",type:"vessel_loaded",mode:"sea",location:"Баку / Алат",observed_at:new Date().toISOString(),note:"Проверка на API"};
 const first=await post("/api/events",data);assert.equal(first.status,201);
 const second=await post("/api/events",data);assert.equal(second.status,200);
 assert.equal((await second.json()).idempotent,true);
 const after=await (await get("/api/shipments/DEMO-0001")).json();
 assert.equal(after.events.filter(e=>e.event_id===data.event_id).length,1);
 assert.equal(after.events.find(e=>e.event_id===data.event_id).source,"Тестово API събитие");
});
test("rejects unknown event types",async()=>{
 const response=await post("/api/events",{reference:"DEMO-0001",event_id:"bad",type:"ship_lost",mode:"sea",location:"Баку",observed_at:new Date().toISOString()});
 assert.equal(response.status,422);
});
test("SSE emits a milestone when an authenticated test event is stored",async()=>{
 const abort=new AbortController();
 const stream=await fetch(base+"/api/shipments/DEMO-0001/stream",{signal:abort.signal});
 assert.equal(stream.status,200);
 const reader=stream.body.getReader();
 const decoder=new TextDecoder();
 const first=decoder.decode((await reader.read()).value);
 assert.match(first,/event: connected/);
 const event_id="sse-test-"+Date.now();
 const postResult=await post("/api/events",{reference:"DEMO-0001",event_id,type:"terminal_out",location:"Поти",mode:"terminal",observed_at:new Date().toISOString()});
 assert.equal(postResult.status,201);
 const chunk=decoder.decode((await reader.read()).value);
 assert.match(chunk,/event: milestone/);
 assert.match(chunk,new RegExp(event_id));
 abort.abort();
});
test("serves frontend module with HTML and JS",async()=>{
 const a=await get("/tracking.html"),b=await get("/tracking.js");
 assert.equal(a.status,200);assert.equal(b.status,200);
 assert.match(await a.text(),/TRACKING MODULE/);
 assert.match(await b.text(),/DEMO-0002/);
});
