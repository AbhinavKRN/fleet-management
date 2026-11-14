import { expect } from 'chai';
import { boot, loginAs, shutdown } from './helper.js';

describe('role-based vehicle deletion', () => {
  let url;
  before(async () => {
    url = (await boot()).url;
  });
  after(shutdown);

  it('lets an admin delete a vehicle and rejects an operator', async () => {
    const operator = await loginAs(url, {
      name: 'Operator',
      email: 'rbac-op@fleet.test',
      password: 'secret12',
      role: 'operator',
    });
    const admin = await loginAs(url, {
      name: 'Admin',
      email: 'rbac-admin@fleet.test',
      password: 'secret12',
      role: 'admin',
    });
    const created = await operator.api.post('/api/vehicles').send({ plate: 'RBAC-1', lat: 10, lng: 10 });
    const id = created.body.vehicle.id;
    const denied = await operator.api.delete(`/api/vehicles/${id}`);
    expect(denied.status).to.equal(403);

    const removed = await admin.api.delete(`/api/vehicles/${id}`);
    expect(removed.status).to.equal(204);
    expect((await admin.api.get(`/api/vehicles/${id}`)).status).to.equal(404);
  });
});
