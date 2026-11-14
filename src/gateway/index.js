import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { openapi } from '../openapi.js';
import { errorHandler } from '../shared/errors.js';
import { requireApiKey } from './apiKey.js';
import { proxy } from './proxy.js';
import { rateLimit } from './rateLimit.js';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

export function createGateway({ targets, apiKeys, limit }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(express.static(publicDir));
  app.get('/api/openapi.json', (_req, res) => res.json(openapi));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'Fleet Management API' }));

  const api = express.Router();
  api.use(requireApiKey(apiKeys));
  api.use(rateLimit(limit));
  api.use('/users', proxy(targets.users));
  api.use('/vehicles', proxy(targets.vehicles));
  api.use('/telemetry', proxy(targets.telemetry));
  api.use('/maps', proxy(targets.maps));
  api.use('/notifications', proxy(targets.notifications));
  api.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use('/api', api);
  app.use(errorHandler);
  return app;
}
