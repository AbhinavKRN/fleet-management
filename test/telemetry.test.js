import { expect } from 'chai';
import { boot, loginAs, shutdown } from './helper.js';

describe('vehicle telemetry submission and storage', () => {
  let url;
  before(async () => {
    url = (await boot()).url;
  });
  after(shutdown);

  it('stores a report and updates the vehicle position', async () => {
    const { api } = await loginAs(url, {
      name: 'Operator',
      email: 'telemetry@fleet.test',
      password: 'secret12',
      role: 'operator',
    });
    const vehicle = await api.post('/api/vehicles').send({ plate: 'TEL-1', lat: 37.7, lng: -122.4 });
    const posted = await api.post('/api/telemetry').send({
      vehicleId: vehicle.body.vehicle.id,
      lat: 37.71,
      lng: -122.41,
      speed: 42,
      battery: 80,
      eventType: 'location_update',
    });
    expect(posted.status).to.equal(201);
    expect(posted.body.telemetry.eventType).to.equal('location_update');
    expect(posted.body.telemetry.speed).to.equal(42);

    const stored = await api.get(`/api/telemetry/${vehicle.body.vehicle.id}`);
    expect(stored.status).to.equal(200);
    expect(stored.body.telemetry).to.have.length(1);
    expect(stored.body.telemetry[0].battery).to.equal(80);

    const moved = await api.get(`/api/vehicles/${vehicle.body.vehicle.id}`);
    expect(moved.body.vehicle.lat).to.equal(37.71);
    expect(moved.body.vehicle.lng).to.equal(-122.41);
  });
});
