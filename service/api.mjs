import {compareRoutes,consolidate,origins,destinations,integrationCapabilities} from './planning.mjs';
export function createCaspianRoutes(h){
 const {check,str,num,choice,date,id,uuid,requireCompany,scoped,digest,fail}=h;
 const types=['registered','pickup_confirmed','terminal_in','terminal_out','rail_loaded','vessel_loaded','vessel_departed','vessel_arrived','customs_cleared','delivered','delay_reported'];
 const modes=['road','rail','sea','terminal','customs'];
 const normalize=r=>({...r,weight_kg:Number(r.weight_kg),volume_m3:Number(r.volume_m3),loading_m:Number(r.loading_m),pickup_date:r.pickup_date instanceof Date?r.pickup_date.toISOString().slice(0,10):r.pickup_date});
 function cargoInput(b){check(b.synthetic===true,'synthetic_only');return {reference:str(b.reference,2,50),origin_name:choice(b.origin_name,origins),destination_name:choice(b.destination_name,destinations),weight_kg:num(b.weight_kg,1,24000),volume_m3:num(b.volume_m3,0.01,80),loading_m:num(b.loading_m,0.01,13.6),pallets:num(b.pallets,0,34),pickup_date:date(b.pickup_date),description:str(b.description,3,3000),temperature:choice(b.temperature||'ambient',['ambient','chilled']),hazardous:b.hazardous===true};}
 async function log(c,u,action,entity,metadata={}){await c.query('INSERT INTO caspian.audit_log(organization_id,entity_type,entity_id,action,metadata) VALUES($1,$2,$3,$4,$5)',[u.company_id,'platform',entity,action,{...metadata,actor_id:u.id}]);}
 return async ctx=>{
  const p=ctx.url.pathname,method=ctx.req.method,{body}=ctx;if(!p.startsWith('/api/caspian/'))return;
  const u=requireCompany(ctx,method==='GET'?null:'caspian');
  return scoped(ctx.caspian,u.company_id,async c=>{
   const company=(await ctx.identity.query('SELECT name_latin,country,registration_number,status,legal_revision FROM identity.companies WHERE id=$1',[u.company_id])).rows[0];
   await c.query('INSERT INTO caspian.organizations(id,legal_name,country_code,registration_number,status) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET legal_name=excluded.legal_name,status=excluded.status',[u.company_id,company.name_latin,company.country,company.registration_number,company.status==='verified'?'verified':company.status==='suspended'?'suspended':'pending']);
   if(p==='/api/caspian/capabilities' && method==='GET')return {integrations:integrationCapabilities,source:'synthetic_only',cities:{origins,destinations},event_types:types,event_modes:modes};
   if(p==='/api/caspian/broker-profile' && method==='GET')return {profile:(await c.query('SELECT * FROM caspian.broker_profiles WHERE organization_id=$1',[u.company_id])).rows[0]||null};
   if(p==='/api/caspian/broker-profile' && method==='PUT'){
    requireCompany(ctx,'caspian',true);check(body.publish_consent===true,'consent_required');check(Array.isArray(body.locations) && body.locations.length>0 && body.locations.length<=6);check(Array.isArray(body.services) && body.services.length>0 && body.services.length<=3);
    const locations=[...new Set(body.locations.map(x=>choice(x,['Poti','Batumi','Alat','Tbilisi','Almaty','Aktau'])))],services=[...new Set(body.services.map(x=>choice(x,['customs','documentation','transit'])))];
    const old=(await c.query('SELECT version FROM caspian.broker_profiles WHERE organization_id=$1 FOR UPDATE',[u.company_id])).rows[0];check(body.version===(old?.version||0),'version_conflict',409);
    await c.query("INSERT INTO caspian.broker_profiles(organization_id,locations,services,description,license_reference,identity_revision) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(organization_id) DO UPDATE SET locations=excluded.locations,services=excluded.services,description=excluded.description,license_reference=excluded.license_reference,identity_revision=excluded.identity_revision,status='pending',version=caspian.broker_profiles.version+1,updated_at=now()",[u.company_id,locations,services,str(body.description,10,3000),str(body.license_reference,5,200),company.legal_revision]);await log(c,u,'broker.profile_submitted',u.company_id);return {status:'pending'};
   }
   if(p==='/api/caspian/brokers' && method==='GET'){
    requireCompany(ctx,null,true);const companies=(await ctx.identity.query("SELECT id,name_native,profile,legal_revision FROM identity.companies WHERE status='verified'")).rows;const byId=new Map(companies.map(c=>[c.id,c]));const location=str(ctx.url.searchParams.get('location')||'',0,100);
    return {items:(await c.query("SELECT organization_id,locations,services,description,identity_revision FROM caspian.broker_profiles WHERE status='approved' AND ($1='' OR $1=ANY(locations))",[location])).rows.filter(r=>byId.get(r.organization_id)?.legal_revision===r.identity_revision).map(r=>({...r,company_name:byId.get(r.organization_id).name_native,contact:byId.get(r.organization_id).profile,verification:'manual_document_review'}))};
   }
   if(p==='/api/caspian/broker-inquiries' && method==='GET')return {items:(await c.query('SELECT * FROM caspian.broker_inquiries ORDER BY created_at DESC LIMIT 100')).rows};
   if(p==='/api/caspian/broker-inquiries' && method==='POST'){
    requireCompany(ctx,'caspian',true);const recipient=id(body.recipient_id);check(recipient!==u.company_id,'own_broker_profile',409);
    const broker=(await c.query("SELECT identity_revision FROM caspian.broker_profiles WHERE organization_id=$1 AND status='approved'",[recipient])).rows[0];check(broker,'not_found',404);
    check((await ctx.identity.query("SELECT id FROM identity.companies WHERE id=$1 AND status='verified' AND legal_revision=$2",[recipient,broker.identity_revision])).rowCount,'not_found',404);
    const bid=uuid();await c.query('INSERT INTO caspian.broker_inquiries(id,sender_id,recipient_id,message) VALUES($1,$2,$3,$4)',[bid,u.company_id,recipient,str(body.message,10,4000)]);await log(c,u,'broker.inquiry_created',bid);ctx.status=201;return {id:bid};
   }
   const brokerInquiry=p.match(/^\/api\/caspian\/broker-inquiries\/([\w-]+)$/);
   if(brokerInquiry && method==='PATCH'){
    const r=(await c.query('SELECT * FROM caspian.broker_inquiries WHERE id=$1 FOR UPDATE',[id(brokerInquiry[1])])).rows[0];check(r,'not_found',404);const status=choice(body.status,['accepted','rejected','closed']);check(status==='closed'||r.recipient_id===u.company_id,'role_denied',403);
    await c.query('UPDATE caspian.broker_inquiries SET status=$2 WHERE id=$1',[r.id,status]);await log(c,u,'broker.inquiry_updated',r.id,{status});return {ok:true};
   }
   if(p==='/api/caspian/cargo' && method==='GET')return {items:(await c.query('SELECT * FROM caspian.cargo_requests ORDER BY created_at DESC LIMIT 100')).rows.map(normalize)};
   const cargo=p.match(/^\/api\/caspian\/cargo(?:\/([\w-]+))?$/);
   if(cargo && ['POST','PUT','DELETE'].includes(method)){
    const cid=cargo[1]?id(cargo[1]):uuid();check(method==='POST'?!cargo[1]:!!cargo[1],'method_not_allowed',405);const data=method==='DELETE'?null:cargoInput(body);
    if(method==='POST'){
     await c.query("INSERT INTO caspian.cargo_requests(id,organization_id,reference,origin_name,destination_name,transport_mode,weight_kg,volume_m3,loading_m,pallets,pickup_date,description,temperature,hazardous,status) VALUES($1,$2,$3,$4,$5,'MULTIMODAL',$6,$7,$8,$9,$10,$11,$12,$13,'published')",[cid,u.company_id,...['reference','origin_name','destination_name','weight_kg','volume_m3','loading_m','pallets','pickup_date','description','temperature','hazardous'].map(k=>data[k])]);ctx.status=201;
    }else{
     const existing=(await c.query('SELECT * FROM caspian.cargo_requests WHERE id=$1 AND organization_id=$2 FOR UPDATE',[cid,u.company_id])).rows[0];check(existing,'not_found',404);check(body.version===existing.version,'version_conflict',409);check(['draft','published'].includes(existing.status),'cargo_locked',409);
     if(method==='DELETE')await c.query("UPDATE caspian.cargo_requests SET status='cancelled',version=version+1 WHERE id=$1",[cid]);
     else await c.query('UPDATE caspian.cargo_requests SET reference=$2,origin_name=$3,destination_name=$4,weight_kg=$5,volume_m3=$6,loading_m=$7,pallets=$8,pickup_date=$9,description=$10,temperature=$11,hazardous=$12,version=version+1,updated_at=now() WHERE id=$1',[cid,...['reference','origin_name','destination_name','weight_kg','volume_m3','loading_m','pallets','pickup_date','description','temperature','hazardous'].map(k=>data[k])]);
    }await log(c,u,`cargo.${method.toLowerCase()}`,cid);return {id:cid};
   }
   if(p==='/api/caspian/routes' && method==='POST'){
    const record=(await c.query("SELECT * FROM caspian.cargo_requests WHERE id=$1 AND status IN ('draft','published','matched')",[id(body.cargo_id)])).rows[0];check(record,'not_found',404);
    const scenario=choice(body.scenario||'normal',['normal','wind','congestion']),objective=choice(body.objective||'balanced',['balanced','cheapest','fastest']);
    return {items:compareRoutes(normalize(record),{scenario,objective}),source:'synthetic_scenario',capacity_reserved:false};
   }
   if(p==='/api/caspian/consolidations' && method==='GET')return {items:(await c.query('SELECT * FROM caspian.consolidations ORDER BY created_at DESC LIMIT 100')).rows};
   if(p==='/api/caspian/matching' && method==='POST'){
    check(Array.isArray(body.cargo_ids) && body.cargo_ids.length>0 && body.cargo_ids.length<=100);const ids=[...new Set(body.cargo_ids.map(id))];check(ids.length===body.cargo_ids.length,'duplicate_cargo');
    const cargos=(await c.query("SELECT * FROM caspian.cargo_requests WHERE id=ANY($1::uuid[]) AND status IN ('draft','published') ORDER BY id FOR UPDATE",[ids])).rows;check(cargos.length===ids.length,'cargo_not_available',409);
    const groups=consolidate(cargos.map(normalize));
    if(body.commit===true){for(const group of groups){const gid=uuid();await c.query('INSERT INTO caspian.consolidations(id,organization_id,plan) VALUES($1,$2,$3)',[gid,u.company_id,group]);for(const cid of group.cargo_ids){await c.query('INSERT INTO caspian.allocations(cargo_id,organization_id,consolidation_id) VALUES($1,$2,$3)',[cid,u.company_id,gid]);await c.query("UPDATE caspian.cargo_requests SET status='matched',version=version+1 WHERE id=$1",[cid]);}group.id=gid;await log(c,u,'consolidation.created',gid);}}
    return {groups,committed:body.commit===true,capacity_reserved:false,scope:'own_company_only'};
   }
   if(p==='/api/caspian/shipments' && method==='GET')return {items:(await c.query('SELECT * FROM caspian.shipments ORDER BY created_at DESC LIMIT 100')).rows};
   if(p==='/api/caspian/shipments' && method==='POST'){
    const cargo=(await c.query("SELECT * FROM caspian.cargo_requests WHERE id=$1 AND status IN ('draft','published','matched') FOR UPDATE",[id(body.cargo_id)])).rows[0];check(cargo,'not_found',404);
    const scenario=choice(body.scenario||'normal',['normal','wind','congestion']),routes=compareRoutes(normalize(cargo),{scenario});const plan=routes.find(r=>r.id===body.route_id);check(plan,'route_unavailable',409);const sid=uuid();
    await c.query("INSERT INTO caspian.shipments(id,organization_id,cargo_request_id,reference,origin_name,destination_name,eta,demo,plan) VALUES($1,$2,$3,$4,$5,$6,$7,true,$8)",[sid,u.company_id,cargo.id,str(body.reference,2,50),cargo.origin_name,cargo.destination_name,new Date(Date.parse(cargo.pickup_date)+plan.estimated_hours*3600000),plan]);
    for(let i=0;i<plan.stages.length;i++){const stage=plan.stages[i];await c.query('INSERT INTO caspian.route_stops(organization_id,shipment_id,ordinal,location_name,mode) VALUES($1,$2,$3,$4,$5)',[u.company_id,sid,i,stage.to,stage.mode]);}
    await log(c,u,'shipment.created',sid,{source:'synthetic'});ctx.status=201;return {id:sid,demo:true,booking:false};
   }
   const shipment=p.match(/^\/api\/caspian\/shipments\/([\w-]+)(?:\/(events|export|checklist))?$/);
   if(shipment){const sid=id(shipment[1]),record=(await c.query('SELECT * FROM caspian.shipments WHERE id=$1 AND organization_id=$2',[sid,u.company_id])).rows[0];check(record,'not_found',404);
    if(method==='GET'){
     const events=(await c.query('SELECT id,source,source_event_id,event_type,location_name,transport_mode,observed_at,received_at,verified,demo,note FROM caspian.tracking_events WHERE shipment_id=$1 ORDER BY observed_at,id',[sid])).rows;
     const docs=(await c.query('SELECT id,kind,name,status FROM caspian.documents WHERE parent_id=$1',[sid])).rows;
     return {...record,events,documents:docs,checklist:['invoice','packing_list','CMR'].map(kind=>({kind,present:docs.some(d=>d.kind===kind),reviewed:docs.some(d=>d.kind===kind && d.status==='reviewed'),officially_submitted:false})),legal_document_issuance:false};
    }
    if(method==='POST' && shipment[2]==='events'){
     const data={event_type:choice(body.event_type,types),location_name:str(body.location_name,2,180),transport_mode:choice(body.transport_mode,modes),observed_at:str(body.observed_at,20,35),note:str(body.note||'',0,2000)};
     check(Number.isFinite(Date.parse(data.observed_at)) && Date.parse(data.observed_at)<=Date.now()+300000,'event_time');const eventId=str(body.source_event_id,1,120),hash=digest(JSON.stringify(data));
     const previous=(await c.query("SELECT id,shipment_id,payload FROM caspian.tracking_events WHERE source='manual-synthetic' AND source_event_id=$1",[eventId])).rows[0];
     if(previous){check(previous.shipment_id===sid && previous.payload.hash===hash,'idempotency_conflict',409);return {id:previous.id,duplicate:true};}
     const eid=uuid();await c.query("INSERT INTO caspian.tracking_events(id,organization_id,shipment_id,source,source_event_id,event_type,location_name,transport_mode,observed_at,verified,demo,note,payload) VALUES($1,$2,$3,'manual-synthetic',$4,$5,$6,$7,$8,false,true,$9,$10)",[eid,u.company_id,sid,eventId,...['event_type','location_name','transport_mode','observed_at','note'].map(k=>data[k]),{hash}]);
     const state=data.event_type==='delivered'?'delivered':data.event_type==='delay_reported'?'delayed':data.event_type==='registered'?'registered':'in_transit';
     // Late-arriving events do not overwrite the current status.
     const latest=(await c.query('SELECT id FROM caspian.tracking_events WHERE shipment_id=$1 ORDER BY observed_at DESC,received_at DESC LIMIT 1',[sid])).rows[0];if(latest.id===eid)await c.query('UPDATE caspian.shipments SET status=$2,updated_at=now() WHERE id=$1',[sid,state]);
     await log(c,u,'tracking.event',sid,{event_type:data.event_type});ctx.status=201;return {id:eid,verified:false,demo:true};
    }
   }
   if(p==='/api/caspian/warehouses' && method==='GET')return {items:(await c.query('SELECT * FROM caspian.warehouses ORDER BY name')).rows};
   if(p==='/api/caspian/warehouses' && method==='POST'){
    const wid=uuid();await c.query('INSERT INTO caspian.warehouses(id,organization_id,name,location,capacity_m3,capacity_kg,daily_eur) VALUES($1,$2,$3,$4,$5,$6,$7)',[wid,u.company_id,str(body.name,3,180),choice(body.location,['Poti','Batumi','Alat','Aktau']),num(body.capacity_m3,1,1e6),num(body.capacity_kg,1,1e8),num(body.daily_eur,0,100000)]);await log(c,u,'warehouse.created',wid);ctx.status=201;return {id:wid,synthetic:true};
   }
   if(p==='/api/caspian/reservations' && method==='GET')return {items:(await c.query('SELECT * FROM caspian.reservations ORDER BY starts_on')).rows};
   if(p==='/api/caspian/reservations' && method==='POST'){
    const wid=id(body.warehouse_id),sid=id(body.shipment_id),start=date(body.starts_on),end=date(body.ends_on);check(end>start);const volume=num(body.volume_m3,0.1,1e6),weight=num(body.weight_kg,1,1e8);
    const warehouse=(await c.query('SELECT * FROM caspian.warehouses WHERE id=$1 FOR UPDATE',[wid])).rows[0];check(warehouse,'not_found',404);
    check((await c.query('SELECT id FROM caspian.shipments WHERE id=$1',[sid])).rowCount,'shipment_not_found',404);
    // Capacity is the peak simultaneous occupation, not the sum of disjoint bookings.
    const used=(await c.query(`WITH occupied AS (SELECT * FROM caspian.reservations WHERE warehouse_id=$1 AND starts_on<$3 AND ends_on>$2),
     deltas AS (SELECT greatest(starts_on,$2::date) AS day,volume_m3 AS v,weight_kg AS w FROM occupied UNION ALL SELECT least(ends_on,$3::date),-volume_m3,-weight_kg FROM occupied),
     grouped AS (SELECT day,sum(v) AS v,sum(w) AS w FROM deltas GROUP BY day),
     running AS (SELECT sum(v) OVER(ORDER BY day ROWS UNBOUNDED PRECEDING) AS volume,sum(w) OVER(ORDER BY day ROWS UNBOUNDED PRECEDING) AS weight FROM grouped)
     SELECT coalesce(max(volume),0) AS volume,coalesce(max(weight),0) AS weight FROM running`,[wid,start,end])).rows[0];
    check(Number(used.volume)+volume<=Number(warehouse.capacity_m3) && Number(used.weight)+weight<=Number(warehouse.capacity_kg),'warehouse_capacity_exceeded',409);
    const rid=uuid();await c.query('INSERT INTO caspian.reservations(id,organization_id,warehouse_id,shipment_id,volume_m3,weight_kg,starts_on,ends_on) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[rid,u.company_id,wid,sid,volume,weight,start,end]);await log(c,u,'warehouse.reserved',rid);ctx.status=201;return {id:rid,synthetic:true,external_booking:false};
   }
   fail(404,'not_found');
  });
 };
}
