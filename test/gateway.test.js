import net from 'node:net';
import request from 'supertest';
import { expect } from 'chai';
import { boot, http, shutdown } from './helper.js';

describe('API gateway', () => {
  describe('api key, invalid JSON, and rate limit', () => {
    let url;
    before(async () => {
      url = (await boot({ RATE_LIMIT_MAX: '3' })).url;
    });
    after(shutdown);

    it('rejects bad keys, bad JSON, and the request past the limit', async () => {
      const missing = await request(url).get('/api/maps/vehicles');
      expect(missing.status).to.equal(401);
      expect(missing.body.error).to.equal('Invalid API key');
      expect((await request(url).get('/api/maps/vehicles').set('x-api-key', 'nope')).status).to.equal(401);

      const invalid = await request(url)
        .post('/api/users/login')
        .set('x-api-key', 'test-key')
        .set('content-type', 'application/json')
        .send('{');
      expect(invalid.status).to.equal(400);
      expect(invalid.body.error).to.equal('Invalid JSON');

      const api = http(url);
      expect((await api.post('/api/users/register').send({
        name: 'Ada',
        email: 'gateway@fleet.test',
        password: 'secret12',
      })).status).to.equal(201);
      const login = await api.post('/api/users/login').send({ email: 'gateway@fleet.test', password: 'secret12' });
      expect(login.status).to.equal(200);
      const authed = http(url, login.body.token);
      expect((await authed.get('/api/users/me')).status).to.equal(200);
      const limited = await authed.get('/api/users/me');
      expect(limited.status).to.equal(429);
      expect(limited.body.error).to.equal('Too many requests');
    });
  });

  describe('routing and unavailable upstream', () => {
    let url;
    let holder;
    before(async () => {
      holder = net.createServer();
      await new Promise((resolve) => holder.listen(0, '127.0.0.1', resolve));
      const dead = `http://127.0.0.1:${holder.address().port}`;
      url = (await boot({}, { targets: { users: dead } })).url;
      await new Promise((resolve) => holder.close(resolve));
    });
    after(shutdown);

    it('forwards a live route and returns 503 when the user service is down', async () => {
      const missing = await request(url).get('/api/not-a-service').set('x-api-key', 'test-key');
      expect(missing.status).to.equal(404);

      const routed = await request(url).get('/api/maps/vehicles').set('x-api-key', 'test-key');
      expect(routed.status).to.equal(401);
      expect(routed.body.error).to.equal('Missing token');

      const down = await request(url)
        .post('/api/users/login')
        .set('x-api-key', 'test-key')
        .send({ email: 'a@b.co', password: 'secret12' });
      expect(down.status).to.equal(503);
      expect(down.body.error).to.equal('Service unavailable');
    });
  });
});
