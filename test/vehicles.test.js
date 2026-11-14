import { expect } from 'chai';
import { boot, loginAs, shutdown } from './helper.js';

describe('vehicle registration and retrieval', () => {
  let url;
  before(async () => {
    url = (await boot()).url;
  });
  after(shutdown);

  it('geocodes an address, stores the vehicle, and reads it back', async () => {
    const { api } = await loginAs(url, {
      name: 'Operator',
      email: 'vehicles@fleet.test',
      password: 'secret12',
      role: 'operator',
    });
    const created = await api.post('/api/vehicles').send({
      plate: 'sf-1001',
      make: 'Ford',
      model: 'Transit',
      address: '1 Market Street, San Francisco',
    });
    expect(created.status).to.equal(201);
    expect(created.body.vehicle.plate).to.equal('SF-1001');
    expect(created.body.vehicle.lat).to.equal(37.7936);
    expect(created.body.vehicle.lng).to.equal(-122.3958);

    const fetched = await api.get(`/api/vehicles/${created.body.vehicle.id}`);
    expect(fetched.status).to.equal(200);
    expect(fetched.body.vehicle.model).to.equal('Transit');

    const listed = await api.get('/api/vehicles');
    expect(listed.body.vehicles.map((vehicle) => vehicle.plate)).to.include('SF-1001');
  });
});
