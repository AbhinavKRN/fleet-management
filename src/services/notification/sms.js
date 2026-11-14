import { randomUUID } from 'node:crypto';
import { getConfig } from '../../shared/config.js';

export function deliverSms({ to, body }) {
  if (getConfig().smsFail || !to || !body) return { status: 'failed' };
  return { status: 'sent', providerId: randomUUID() };
}
