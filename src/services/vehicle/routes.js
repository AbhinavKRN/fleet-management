import { requireAuth } from '../../shared/auth.js';
import { lookupAddress, notify } from '../../shared/clients.js';
import { STATUSES } from '../../shared/constants.js';
import { all, get, insert, present, presentAll, run } from '../../shared/db.js';
import { asyncHandler, HttpError } from '../../shared/errors.js';
import { coordinates } from '../../shared/geo.js';
import { assertEnum, requireFields } from '../../shared/validate.js';

async function locate(body, authorization) {
  const point = coordinates(body.lat, body.lng);
  if (point) return point;
  if (!body.address) throw new HttpError(400, 'Address or coordinates required');
  const found = await lookupAddress(authorization, body.address);
  return { lat: found.lat, lng: found.lng };
}

function readVehicle(id) {
  return present(get('SELECT * FROM vehicles WHERE id = ?', id));
}

export function vehicleRoutes(app) {
  app.post('/', requireAuth('admin', 'operator'), asyncHandler(async (req, res) => {
    requireFields(req.body, ['plate']);
    const plate = String(req.body.plate).trim().toUpperCase();
    if (!plate) throw new HttpError(400, 'Missing plate');
    const status = req.body.status || 'active';
    assertEnum(status, STATUSES, 'status');
    if (get('SELECT id FROM vehicles WHERE plate = ?', plate)) throw new HttpError(409, 'Plate already registered');
    const point = await locate(req.body, req.get('authorization'));
    const id = insert(
      'INSERT INTO vehicles (plate, make, model, address, lat, lng, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      plate,
      req.body.make || null,
      req.body.model || null,
      req.body.address || null,
      point.lat,
      point.lng,
      status,
    );
    res.status(201).json({ vehicle: readVehicle(id) });
  }));

  app.get('/', requireAuth(), asyncHandler(async (_req, res) => {
    res.json({ vehicles: presentAll(all('SELECT * FROM vehicles ORDER BY id')) });
  }));

  app.patch('/:id/status', requireAuth('admin', 'operator'), asyncHandler(async (req, res) => {
    requireFields(req.body, ['status']);
    assertEnum(req.body.status, STATUSES, 'status');
    const existing = get('SELECT * FROM vehicles WHERE id = ?', req.params.id);
    if (!existing) throw new HttpError(404, 'Vehicle not found');
    run(`UPDATE vehicles SET status = ?, updated_at = datetime('now') WHERE id = ?`, req.body.status, existing.id);
    const vehicle = readVehicle(existing.id);
    await notify(req.get('authorization'), {
      vehicleId: vehicle.id,
      eventType: 'status_change',
      message: `Vehicle ${vehicle.plate} status is now ${vehicle.status}`,
    });
    res.json({ vehicle });
  }));

  app.get('/:id', requireAuth(), asyncHandler(async (req, res) => {
    const vehicle = readVehicle(req.params.id);
    if (!vehicle) throw new HttpError(404, 'Vehicle not found');
    res.json({ vehicle });
  }));

  app.delete('/:id', requireAuth('admin'), asyncHandler(async (req, res) => {
    const result = run('DELETE FROM vehicles WHERE id = ?', req.params.id);
    if (!result.changes) throw new HttpError(404, 'Vehicle not found');
    res.status(204).end();
  }));
}
