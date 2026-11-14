import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

let current;

export async function boot(env = {}, options = {}) {
  const file = path.join(os.tmpdir(), `fleet-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
  Object.assign(process.env, {
    GEOCODER: 'mock',
    JWT_SECRET: 'test-secret',
    API_KEYS: 'test-key',
    RATE_LIMIT_MAX: '1000',
    RATE_LIMIT_WINDOW_MS: '60000',
    SMS_FAIL: '0',
    PORT: '0',
    DATABASE_PATH: file,
    ...env,
  });
  const { startAll } = await import('../src/start.js');
  current = await startAll(options);
  current.file = process.env.DATABASE_PATH;
  return current;
}

export async function shutdown() {
  if (!current) return;
  const file = current.file;
  await current.close();
  current = null;
  fs.rmSync(file, { force: true });
}

export function http(url, token) {
  const send = (method, pathname) => {
    const req = request(url)[method](pathname).set('x-api-key', 'test-key');
    if (token) req.set('authorization', `Bearer ${token}`);
    return req;
  };
  return {
    post: (pathname) => send('post', pathname),
    get: (pathname) => send('get', pathname),
    patch: (pathname) => send('patch', pathname),
    delete: (pathname) => send('delete', pathname),
  };
}

export async function loginAs(url, user) {
  const api = http(url);
  const created = await api.post('/api/users/register').send(user);
  if (created.status !== 201) throw new Error(`register ${created.status} ${JSON.stringify(created.body)}`);
  const login = await api.post('/api/users/login').send({ email: user.email, password: user.password });
  if (login.status !== 200) throw new Error(`login ${login.status} ${JSON.stringify(login.body)}`);
  return { token: login.body.token, user: login.body.user, api: http(url, login.body.token) };
}
