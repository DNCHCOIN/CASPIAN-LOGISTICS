import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
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
const staticTestFiles = {
  '/test-login': ['../public/test-login.html','text/html; charset=utf-8'],
  '/test-login.css': ['../public/test-login.css','text/css; charset=utf-8'],
  '/test-login.js': ['../public/test-login.js','application/javascript; charset=utf-8']
};
async function dispatch(req,res){
  const url=new URL(req.url ?? '/', 'http://localhost');
  if(authRoutes && req.method==='GET' && staticTestFiles[url.pathname]){
    const [file,type]=staticTestFiles[url.pathname];
    const bytes=await readFile(new URL(file,import.meta.url));
    res.writeHead(200,{
      'Content-Type':type,
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'none'; style-src 'self'; script-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      'X-Frame-Options':'DENY'
    });
    res.end(bytes);
    return;
  }
  return handler(req,res);
}
const server = createServer((req, res) => { Promise.resolve(dispatch(req, res)).catch(err => {
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