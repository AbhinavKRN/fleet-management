import { timingSafeEqual } from 'node:crypto';

function matches(presented, expected) {
  const left = Buffer.from(presented);
  const right = Buffer.from(expected);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function requireApiKey(keys) {
  return (req, res, next) => {
    const presented = req.get('x-api-key') || '';
    if (!keys.some((key) => matches(presented, key))) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    next();
  };
}
