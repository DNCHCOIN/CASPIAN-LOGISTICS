import { passwordMatches, parseSessionCookie, sessionCookie,
  newSessionToken, expiry, loginAllowed } from './test-auth.mjs';

// Explicitly limited to local development. Never enable this on an internet-facing host.
const allowedHosts = new Set(['127.0.0.1', '::1']);
const attempts = new Map();
const RATE_WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
function json(res,code,body,headers={}) {
  res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});
  res.end(JSON.stringify(body));
}
async function readJson(req) {
  let size=0;const chunks=[];
  for await(const chunk of req) {
    size+=chunk.length;
    if(size>4096) throw Object.assign(new Error('too large'),{status:413});
    chunks.push(chunk);
  }
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch {throw Object.assign(new Error('invalid json'),{status:400});}
}
export function makeTestAuthRoutes({store,host='127.0.0.1',enabled=loginAllowed(),now=()=>Date.now()}={}) {
  if (!store || !['getByLogin','createSession','getSession','revoke'].every(key=>typeof store[key]==='function'))
    throw new TypeError('test auth store missing');
  return async function testAuth(req,res,path) {
    if (!path.startsWith('/api/v1/test-auth/')) return false;
    // This dev-only endpoint must be physically bound to loopback; do not trust X-Forwarded headers.
    if (!enabled || !allowedHosts.has(host)) { json(res,404,{error:'not_found'});return true; }
    const allowed={
      '/api/v1/test-auth/login':'POST',
      '/api/v1/test-auth/me':'GET',
      '/api/v1/test-auth/logout':'POST'
    };
    if (!(path in allowed)) {json(res,404,{error:'not_found'});return true;}
    if (req.method!==allowed[path]) {json(res,405,{error:'method_not_allowed'},{Allow:allowed[path]});return true;}
    if(req.method==='POST'){
      const origin=req.headers.origin;
      const expected='http://'+(host==='::1'?'[::1]':host)+':'+(req.socket.localPort || 3001);
      if(origin && origin!==expected){json(res,403,{error:'origin_rejected'});return true;}
      if(req.headers['sec-fetch-site'] && !['same-origin','none'].includes(req.headers['sec-fetch-site'])){
        json(res,403,{error:'origin_rejected'});return true;
      }
    }
    if(path.endsWith('/login')){
      const ip=req.socket.remoteAddress || 'unknown';
      const current=now(),state=attempts.get(ip);
      const item=state && state.until>current?state:{count:0,until:current+RATE_WINDOW};
      if(item.count>=MAX_ATTEMPTS){json(res,429,{error:'try_later'});return true;}
      let data;
      try{data=await readJson(req);}catch(e){json(res,e.status||400,{error:'invalid_request'});return true;}
      const username=typeof data?.username==='string'?data.username:'';
      const password=typeof data?.password==='string'?data.password:'';
      if(!/^[a-z][a-z0-9_-]{2,31}$/.test(username) || password.length>1024) {
        json(res,401,{error:'invalid_credentials'});return true;
      }
      const account=await store.getByLogin(username);
      const ok=account?.is_active===true && await passwordMatches(password,account.password_salt,account.password_hash);
      if(!ok){item.count++;attempts.set(ip,item);json(res,401,{error:'invalid_credentials'});return true;}
      attempts.delete(ip);
      const token=newSessionToken();
      await store.createSession(account.id,token,expiry());
      json(res,200,{user:{username:account.login_name,name:account.display_name,role:account.role}},
        {'Set-Cookie':sessionCookie(token,false)});
      return true;
    }
    const token=parseSessionCookie(req.headers.cookie);
    if(path.endsWith('/me')){
      if(!token){json(res,401,{error:'unauthorized'});return true;}
      const user=await store.getSession(token);
      if(!user){json(res,401,{error:'unauthorized'});return true;}
      json(res,200,{user:{username:user.login_name,name:user.display_name,role:user.role}});
      return true;
    }
    if(token)await store.revoke(token);
    json(res,200,{ok:true},{'Set-Cookie':sessionCookie('',false,0)});
    return true;
  };
}
