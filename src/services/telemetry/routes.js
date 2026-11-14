import { requireAuth } from '../../shared/auth.js';
import { notify } from '../../shared/clients.js';
import { CRITICAL_EVENTS, EVENTS } from '../../shared/constants.js';
import { all, get, insert, present, presentAll, run } from '../../shared/db.js';
import { asyncHandler, HttpError } from '../../shared/errors.js';
import { coordinates } from '../../shared/geo.js';
import { assertEnum, numberOrNull, requireFields } from '../../shared/validate.js';

export function telemetryRoutes(app) {
  app.post('/', requireAuth('admin', 'operator'), asyncHandler(async (req, res) => {
    requireFields(req.body, ['vehicleId', 'eventType']);
    assertEnum(req.body.eventType, EVENTS, 'eventType');
    const vehicle = get('SELECT * FROM vehicles WHERE id = ?', req.body.vehicleId);
    if (!vehicle) throw new HttpError(404, 'Vehicle not found');
    const point = coordinates(req.body.lat, req.body.lng);
    const id = insert(
      'INSERT INTO telemetry (vehicle_id, lat, lng, speed, battery, event_type) VALUES (?, ?, ?, ?, ?, ?)',
      vehicle.id,
      point?.lat ?? null,
      point?.lng ?? null,
      numberOrNull(req.body.speed),
      numberOrNull(req.body.battery),
      req.body.eventType,
    );
    if (point) {
      run(
        `UPDATE vehicles SET lat = ?, lng = ?, updated_at = datetime('now') WHERE id = ?`,
        point.lat,
        point.lng,
        vehicle.id,
      );
    }
    if (CRITICAL_EVENTS.includes(req.body.eventType)) {
      await notify(req.get('authorization'), {
        vehicleId: vehicle.id,
        eventType: req.body.eventType,
        message: `Vehicle ${vehicle.plate} reported ${req.body.eventType.replaceAll('_', ' ')}`,
      });
    }
    res.status(201).json({ telemetry: present(get('SELECT * FROM telemetry WHERE id = ?', id)) });
  }));

  app.get('/:vehicleId', requireAuth(), asyncHandler(async (req, res) => {
    const vehicle = get('SELECT id FROM vehicles WHERE id = ?', req.params.vehicleId);
    if (!vehicle) throw new HttpError(404, 'Vehicle not found');
    res.json({
      telemetry: presentAll(all('SELECT * FROM telemetry WHERE vehicle_id = ? ORDER BY id', vehicle.id)),
    });
  }));
}
