import fs from 'node:fs';
import path from 'node:path';

const envFile = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] === undefined) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

function positive(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getConfig() {
  const apiKeys = (process.env.API_KEYS || 'fleet-dev-key')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
  return {
    jwtSecret: process.env.JWT_SECRET || 'dev-only-secret',
    apiKeys,
    rateLimitMax: positive(process.env.RATE_LIMIT_MAX, 100),
    rateLimitWindowMs: positive(process.env.RATE_LIMIT_WINDOW_MS, 60000),
    geocoder: process.env.GEOCODER || 'nominatim',
    smsFail: process.env.SMS_FAIL === '1',
    databasePath: process.env.DATABASE_PATH || 'data/fleet.db',
  };
}
