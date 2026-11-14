export function rateLimit({ max, windowMs }) {
  const buckets = new Map();
  return (req, res, next) => {
    const id = req.get('x-api-key') || req.ip;
    const now = Date.now();
    const recent = (buckets.get(id) || []).filter((stamp) => now - stamp < windowMs);
    if (recent.length >= max) return res.status(429).json({ error: 'Too many requests' });
    recent.push(now);
    buckets.set(id, recent);
    next();
  };
}
