// Ephemeral CI integration test only: requires a disposable database and loopback-only API.
// NEVER points at production or uses real credentials.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { passwordDigest } from '../src/test-auth.mjs';

if (process.env.ENABLE_TEST_AUTH !== 'true' || process.env.NODE_ENV === 'production'
  || process.env.CASPIAN_CI_TEST !== 'true') {
  throw Error('Disposable CI test mode is required');
}
const db=process.env.DATABASE_URL;
if (!db || !/caspian_test(?:$|[?])/.test(db)) throw Error('Test-only caspian_test DB required');
const origin='http://127.0.0.1:3001';
const pool=new Pool({connectionString:db});
const unique=()=> 'QaTesting'+randomBytes(14).toString('hex')+'123!';
const creds=[{username:'nedka-admin', password:unique()},
 {username:'tsvetan-admin',password:unique()}];
try {
  for(const {username,password} of creds){
    const digest=await passwordDigest(password);
    await pool.query(`INSERT INTO test_accounts
      (login_name,display_name,role,password_salt,password_hash)
      VALUES($1,$2,'test_admin',$3,$4)
      ON CONFLICT(login_name) DO UPDATE
      SET role='test_admin',password_salt=EXCLUDED.password_salt,
          password_hash=EXCLUDED.password_hash,is_active=true`,
      [username, username, digest.salt,digest.hash]);
  }
  const sessions=[];
  for(const cred of creds){
    const result=await fetch(origin+'/api/v1/test-auth/login', {
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(cred)
    });
    assert.equal(result.status,200,cred.username+' login');
    const body=await result.json();
    assert.equal(body.user.username,cred.username);
    assert.equal(body.user.role,'test_admin');
    const cookie=result.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie,'session cookie');
    const profile=await fetch(origin+'/api/v1/test-auth/me',{headers:{cookie}});
    assert.equal(profile.status,200);
    assert.equal((await profile.json()).user.username,cred.username);
    sessions.push(cookie);
  }
  assert.notEqual(sessions[0],sessions[1],'independent sessions');
  const invalid=await fetch(origin+'/api/v1/test-auth/login',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({username:'tsvetan-admin',password:'Incorrect123!'})
  });
  assert.equal(invalid.status,401);
  const cross=await fetch(origin+'/api/v1/test-auth/me',{headers:{cookie:sessions[0]}});
  assert.equal((await cross.json()).user.username,'nedka-admin');
  const logout=await fetch(origin+'/api/v1/test-auth/logout',{
    method:'POST',headers:{cookie:sessions[0]}
  });
  assert.equal(logout.status,200);
  const revoked=await fetch(origin+'/api/v1/test-auth/me',{headers:{cookie:sessions[0]}});
  assert.equal(revoked.status,401);
  const unaffected=await fetch(origin+'/api/v1/test-auth/me',{headers:{cookie:sessions[1]}});
  assert.equal(unaffected.status,200);
  const stored=await pool.query('SELECT count(*)::int AS count FROM test_sessions');
  assert.ok(stored.rows[0].count >= 1);
  console.log('PASS: both admin accounts, unique sessions, isolation, invalid login and logout');
} finally {
  await pool.end();
}
