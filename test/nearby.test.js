import { expect } from 'chai';
import { boot, loginAs, shutdown } from './helper.js';

describe('nearby vehicle search', () => {
  let url;
  before(async () => {
    url = (await boot()).url;
  });
  after(shutdown);

  it('returns only vehicles inside the radius and geocodes with the mock', async () => {
    const { api } = await loginAs(url, {
      name: 'Operator',
      email: 'maps@fleet.test',
      password: 'secret12',
      role: 'operator',
    });
    await api.post('/api/vehicles').send({ plate: 'NEAR', lat: 37.7936, lng: -122.3958 });
    await api.post('/api/vehicles').send({ plate: 'MID', lat: 37.79, lng: -122.4 });
    await api.post('/api/vehicles').send({ plate: 'FAR', lat: 37.9, lng: -122.4 });

    const nearby = await api.get('/api/maps/nearby').query({ lat: 37.7936, lng: -122.3958, radiusKm: 2 });
    expect(nearby.status).to.equal(200);
    expect(nearby.body.vehicles.map((vehicle) => vehicle.plate)).to.deep.equal(['NEAR', 'MID']);
    expect(nearby.body.vehicles.every((vehicle) => vehicle.distanceKm <= 2)).to.equal(true);

    const geocoded = await api.get('/api/maps/geocode').query({ address: '1 Market Street, San Francisco' });
    expect(geocoded.status).to.equal(200);
    expect(geocoded.body).to.deep.equal({
      lat: 37.7936,
      lng: -122.3958,
      displayName: '1 Market Street, San Francisco',
    });
  });
});
