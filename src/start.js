import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createGateway } from './gateway/index.js';
import { mapRoutes } from './services/maps/routes.js';
import { notificationRoutes } from './services/notification/routes.js';
import { telemetryRoutes } from './services/telemetry/routes.js';
import { userRoutes } from './services/user/routes.js';
import { vehicleRoutes } from './services/vehicle/routes.js';
import { getConfig } from './shared/config.js';
import { createService, listen, stop } from './shared/createService.js';
import { closeDb, openDb } from './shared/db.js';
import { setUrls } from './shared/urls.js';

const services = [
  ['users', userRoutes],
  ['vehicles', vehicleRoutes],
  ['telemetry', telemetryRoutes],
  ['maps', mapRoutes],
  ['notifications', notificationRoutes],
];

export async function startAll(options = {}) {
  const config = getConfig();
  openDb(config.databasePath);
  const running = [];
  const targets = {};
  for (const [name, routes] of services) {
    const started = await listen(createService(routes));
    running.push(started.server);
    targets[name] = started.url;
  }
  setUrls(targets);
  const gateway = await listen(createGateway({
    targets: { ...targets, ...options.targets },
    apiKeys: config.apiKeys,
    limit: { max: config.rateLimitMax, windowMs: config.rateLimitWindowMs },
  }), Number(process.env.PORT || 0));
  return {
    url: gateway.url,
    close: async () => {
      await stop(gateway.server);
      for (const server of running) await stop(server);
      closeDb();
    },
  };
}

function isMain() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isMain()) {
  startAll()
    .then(({ url }) => {
      console.log(`Gateway  ${url}`);
      console.log(`Map      ${url}/`);
      console.log(`Swagger  ${url}/api/docs`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
