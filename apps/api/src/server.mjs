import { createServer } from 'node:http';
import { Pool } from 'pg';
import { createHandler } from './handler.mjs';
import { createTestAuthStore } from './test-auth-store.mjs';
import { makeTestAuthRoutes } from './test-auth-routes.mjs';
import { loginAllowed } from './test-auth.mjs';

const port = Number.parseInt(process.env.PORT ?? '3001', 10);
const host = process.env.HOST ?? '127.0.0.1';
const databaseUrl = process.env.DATABASE_URL;
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: databaseUrl, max: 5, connectionTimeoutMillis: 3000 });
const authRoutes = loginAllowed() && ['127.0.0.1','::1'].includes(host)
  ? makeTestAuthRoutes({store:createTestAuthStore(pool),host,enabled:true}) : null;
const handler = createHandler({ checkDatabase: () => pool.query('SELECT 1'), authRoutes });
const server = createServer((req, res) => { Promise.resolve(handler(req, res)).catch(err => {
  console.error('Unhandled request failure', err);
  if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'internal_error' }));
}); });
server.listen(port, host, () => console.log(`CASPIAN API listening on ${host}:${port}`));
async function shutdown() {
  server.close();
  await pool.end();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);