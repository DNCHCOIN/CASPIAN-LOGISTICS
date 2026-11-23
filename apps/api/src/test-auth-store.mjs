import {tokenHash} from './test-auth.mjs';
export function createTestAuthStore(pool) {
  return {
    async getByLogin(login) {
      const r=await pool.query('SELECT id,login_name,display_name,role,password_salt,password_hash,is_active FROM test_accounts WHERE login_name=$1',[login]);
      return r.rows[0] ?? null;
    },
    async createSession(accountId,token,expires) {
      await pool.query('INSERT INTO test_sessions(account_id,token_hash,expires_at) VALUES($1,$2,$3)',[accountId,tokenHash(token),expires]);
    },
    async getSession(token) {
      const r=await pool.query(`SELECT a.id,a.login_name,a.display_name,a.role FROM test_sessions s JOIN test_accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>now() AND a.is_active=true`,[tokenHash(token)]);
      return r.rows[0] ?? null;
    },
    async revoke(token) {
      await pool.query('DELETE FROM test_sessions WHERE token_hash=$1',[tokenHash(token)]);
    }
  };
}
