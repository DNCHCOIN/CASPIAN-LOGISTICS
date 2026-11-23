import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createHandler } from '../src/handler.mjs';

async function request(path, checkDatabase, method = 'GET') {
  const server = createServer(createHandler({ checkDatabase, logger: { error() {} } }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { method });
    return { status: response.status, json: await response.json(), headers: response.headers };
  } finally { await new Promise(resolve => server.close(resolve)); }
}
test('liveness reports running process even without database', async () => {
  const r = await request('/health/live', async () => { throw Error('DB down'); });
  assert.equal(r.status, 200);
  assert.equal(r.json.status, 'ok');
  assert.equal(r.headers.get('cache-control'), 'no-store');
});
test('readiness requires successful database check', async () => {
  const r = await request('/health/ready', async () => {});
  assert.equal(r.status, 200);
  assert.equal(r.json.status, 'ready');
});
test('readiness fails closed and does not leak DB errors', async () => {
  const r = await request('/health/ready', async () => { throw Error('super-secret connection text'); });
  assert.equal(r.status, 503);
  assert.equal(r.json.status, 'unavailable');
  assert.doesNotMatch(JSON.stringify(r.json), /super-secret/);
});
test('business endpoints unavailable by default', async () => {
  const r = await request('/api/v1/companies', async () => {});
  assert.equal(r.status, 404);
});
test('unimplemented POST is not accepted', async () => {
  const r = await request('/health/live', async () => {}, 'POST');
  assert.equal(r.status, 404);
});