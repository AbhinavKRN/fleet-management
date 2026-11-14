import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import { boot, http, shutdown } from './helper.js';

describe('user login and JWT verification', () => {
  let url;
  before(async () => {
    url = (await boot()).url;
  });
  after(shutdown);

  it('registers, logs in, and accepts only a valid token', async () => {
    const api = http(url);
    const registered = await api.post('/api/users/register').send({
      name: 'Ada Fleet',
      email: 'ada@fleet.test',
      password: 'secret12',
      role: 'operator',
    });
    expect(registered.status).to.equal(201);
    expect(registered.body.user.email).to.equal('ada@fleet.test');
    expect(registered.body.user).to.not.have.property('passwordHash');

    const login = await api.post('/api/users/login').send({ email: 'ada@fleet.test', password: 'secret12' });
    expect(login.status).to.equal(200);
    const payload = jwt.verify(login.body.token, 'test-secret');
    expect(payload.email).to.equal('ada@fleet.test');
    expect(payload.role).to.equal('operator');

    const me = await http(url, login.body.token).get('/api/users/me');
    expect(me.status).to.equal(200);
    expect(me.body.user.id).to.equal(payload.sub);

    expect((await api.get('/api/users/me')).status).to.equal(401);
    expect((await http(url, `${login.body.token}x`).get('/api/users/me')).status).to.equal(401);
    expect((await api.post('/api/users/login').send({ email: 'ada@fleet.test', password: 'wrong-password' })).status).to.equal(401);
  });
});
