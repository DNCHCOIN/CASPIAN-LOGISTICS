import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {makeTestAuthRoutes} from '../src/test-auth-routes.mjs';
import {passwordDigest} from '../src/test-auth.mjs';
async function fixture(){
  const pass=await passwordDigest('ExamplePassword123!');
  const sessions=new Map();
  const account={id:'one',login_name:'nedka-admin',display_name:'DNCH',role:'test_admin',is_active:true,
    password_salt:pass.salt,password_hash:pass.hash};
  const store={
    getByLogin:async name=>name==='nedka-admin'?account:null,
    createSession:async(id,token)=>{sessions.set(token,account);},
    getSession:async token=>sessions.get(token)||null,
    revoke:async token=>{sessions.delete(token);}
  };
  const handler=makeTestAuthRoutes({store,enabled:true,host:'127.0.0.1'});
  const server=createServer((req,res)=>{handler(req,res,new URL(req.url,'http://localhost').pathname)
    .catch(()=>{res.writeHead(500);res.end();});});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const url='http://127.0.0.1:'+server.address().port;
  return {url,close:()=>new Promise(ok=>server.close(ok))};
}
test('login, profile, logout are session-backed', async()=>{
 const f=await fixture();
 try{
  const login=await fetch(f.url+'/api/v1/test-auth/login',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({username:'nedka-admin',password:'ExamplePassword123!'})});
  assert.equal(login.status,200);assert.equal((await login.json()).user.role,'test_admin');
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const me=await fetch(f.url+'/api/v1/test-auth/me',{headers:{cookie}});
  assert.equal((await me.json()).user.username,'nedka-admin');
  const out=await fetch(f.url+'/api/v1/test-auth/logout',{method:'POST',headers:{cookie}});
  assert.equal(out.status,200);
  const after=await fetch(f.url+'/api/v1/test-auth/me',{headers:{cookie}});
  assert.equal(after.status,401);
 }finally{await f.close();}
});
test('bad credentials rejected with no cookie',async()=>{
 const f=await fixture();try{
  const r=await fetch(f.url+'/api/v1/test-auth/login',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({username:'nedka-admin',password:'BadPassword123!'})});
  assert.equal(r.status,401);assert.equal(r.headers.get('set-cookie'),null);
 }finally{await f.close();}
});
test('cross-origin write request rejected',async()=>{
 const f=await fixture();try{
  const r=await fetch(f.url+'/api/v1/test-auth/login',{method:'POST',
    headers:{origin:'https://evil.example','content-type':'application/json'},
    body:JSON.stringify({username:'nedka-admin',password:'ExamplePassword123!'})});
  assert.equal(r.status,403);
 }finally{await f.close();}
});
test('non-loopback / disabled routes are inaccessible',async()=>{
 const store={getByLogin:async()=>null,createSession:async()=>{},getSession:async()=>null,revoke:async()=>{}};
 for(const opts of [{enabled:false,host:'127.0.0.1'},{enabled:true,host:'0.0.0.0'}]){
  const route=makeTestAuthRoutes({store,...opts});
  const result={writeHead(c){this.status=c;},end(){}};
  await route({method:'GET',headers:{}},result,'/api/v1/test-auth/me');
  assert.equal(result.status,404);
 }
});
