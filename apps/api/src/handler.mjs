/** Read-only infrastructure endpoints only. No authentication or business endpoints yet. */
export function createHandler({ checkDatabase, authRoutes = null, logger = console } = {}) {
  if (typeof checkDatabase !== 'function') throw new TypeError('checkDatabase function required');
  return async function handler(req, res) {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (authRoutes && await authRoutes(req,res,path)) return;
    if (req.method === 'GET' && path === '/health/live') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', service: 'caspian-api' }));
      return;
    }
    if (req.method === 'GET' && path === '/health/ready') {
      try {
        await checkDatabase();
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ready' }));
      } catch (error) {
        logger.error?.('Readiness check failed', { message: error?.message });
        res.writeHead(503);
        res.end(JSON.stringify({ status: 'unavailable' }));
      }
      return;
    }
    res.setHeader('Allow', 'GET');
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'not_found' }));
  };
}