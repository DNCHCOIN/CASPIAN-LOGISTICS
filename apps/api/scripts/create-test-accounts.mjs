// Run manually in isolated staging AFTER applying SQL migrations.
// Credentials come ONLY from environment / operator terminal, never committed.
import { Pool } from 'pg';
import { passwordDigest } from '../src/test-auth.mjs';
const url=process.env.DATABASE_URL;
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_TEST_AUTH !== 'true')
  throw Error('Requires ENABLE_TEST_AUTH=true and non-production NODE_ENV');
if(!url)throw Error('DATABASE_URL required');
const first=process.env.TEST_ADMIN_PASSWORD;
const second=process.env.TEST_TSVETAN_PASSWORD;
if (!first || !second || first===second) throw Error('Provide two different long passwords using TEST_ADMIN_PASSWORD and TEST_TSVETAN_PASSWORD');
const accounts=[['nedka-admin','DNCH development','test_admin',first],['tsvetan-admin','Tsvetan development','test_admin',second]];
const pool=new Pool({connectionString:url});
try {
  for(const [login,displayName,role,password] of accounts) {
    const {salt,hash}=await passwordDigest(password);
    await pool.query(`INSERT INTO test_accounts(login_name,display_name,role,password_salt,password_hash)
      VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(login_name) DO UPDATE SET display_name=EXCLUDED.display_name,role=EXCLUDED.role,
      password_salt=EXCLUDED.password_salt,password_hash=EXCLUDED.password_hash,is_active=true`,
      [login,displayName,role,salt,hash]);
    // Credential rotation invalidates previous sessions.
    await pool.query('DELETE FROM test_sessions WHERE account_id=(SELECT id FROM test_accounts WHERE login_name=$1)',[login]);
  }
  console.log('Two isolated test accounts provisioned: nedka-admin, tsvetan-admin. No passwords printed.');
} finally {await pool.end();}
