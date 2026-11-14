export function proxy(target) {
  return async (req, res) => {
    const suffix = req.originalUrl.replace(/^\/api\/[^/?#]+/, '') || '/';
    const url = new URL(suffix, `${target}/`);
    const headers = {};
    if (req.headers.authorization) headers.authorization = req.headers.authorization;
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    if (hasBody) headers['content-type'] = 'application/json';
    try {
      const upstream = await fetch(url, {
        method: req.method,
        headers,
        body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      });
      const body = await upstream.text();
      const type = upstream.headers.get('content-type');
      if (type) res.set('content-type', type);
      res.status(upstream.status);
      if (upstream.status === 204 || !body) return res.end();
      res.send(body);
    } catch {
      if (!res.headersSent) res.status(503).json({ error: 'Service unavailable' });
    }
  };
}
