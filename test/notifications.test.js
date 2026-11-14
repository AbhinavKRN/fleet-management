import { expect } from 'chai';
import { boot, loginAs, shutdown } from './helper.js';

describe('status changes and critical events notify administrators', () => {
  let url;
  before(async () => {
    url = (await boot()).url;
  });
  after(shutdown);

  it('records sent and failed SMS attempts', async () => {
    await loginAs(url, {
      name: 'Admin',
      email: 'admin@fleet.test',
      password: 'secret12',
      role: 'admin',
      phone: '+15551230000',
    });
    await loginAs(url, {
      name: 'Desk',
      email: 'desk@fleet.test',
      password: 'secret12',
      role: 'admin',
    });
    const { api } = await loginAs(url, {
      name: 'Operator',
      email: 'notify@fleet.test',
      password: 'secret12',
      role: 'operator',
    });
    const vehicle = await api.post('/api/vehicles').send({ plate: 'NT-1', lat: 1, lng: 2 });
    const id = vehicle.body.vehicle.id;
    const status = await api.patch(`/api/vehicles/${id}/status`).send({ status: 'maintenance' });
    expect(status.status).to.equal(200);
    expect(status.body.vehicle.status).to.equal('maintenance');

    const fault = await api.post('/api/telemetry').send({
      vehicleId: id,
      lat: 1.1,
      lng: 2.1,
      battery: 5,
      eventType: 'engine_fault',
    });
    expect(fault.status).to.equal(201);

    const notes = await api.get('/api/notifications');
    expect(notes.status).to.equal(200);
    const rows = notes.body.notifications;
    expect(rows.filter((row) => row.eventType === 'status_change' && row.status === 'sent')).to.have.length(1);
    expect(rows.filter((row) => row.eventType === 'status_change' && row.status === 'failed')).to.have.length(1);
    expect(rows.filter((row) => row.eventType === 'engine_fault' && row.status === 'sent')).to.have.length(1);
    expect(rows.some((row) => row.phone === '+15551230000' && row.status === 'sent')).to.equal(true);
    expect(rows.some((row) => row.message.includes('engine fault'))).to.equal(true);
  });
});
