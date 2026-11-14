import express from 'express';
import { errorHandler } from './errors.js';

export function createService(mount) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ ok: true }));
  mount(app);
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}

export function listen(app, port = 0) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => {
      const { port: bound } = server.address();
      resolve({ server, url: `http://127.0.0.1:${bound}` });
    });
    server.on('error', reject);
  });
}

export function stop(server) {
  return new Promise((resolve) => {
    server.closeAllConnections?.();
    server.close(() => resolve());
  });
}
