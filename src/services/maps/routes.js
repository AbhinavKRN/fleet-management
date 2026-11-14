import { requireAuth } from '../../shared/auth.js';
import { all, presentAll } from '../../shared/db.js';
import { asyncHandler, HttpError } from '../../shared/errors.js';
import { coordinates, haversineKm } from '../../shared/geo.js';
import { requireFields } from '../../shared/validate.js';
import { geocode } from './geocoder.js';

export function mapRoutes(app) {
  app.get('/geocode', requireAuth(), asyncHandler(async (req, res) => {
    requireFields(req.query, ['address']);
    res.json(await geocode(req.query.address));
  }));

  app.get('/vehicles', requireAuth(), asyncHandler(async (_req, res) => {
    res.json({
      vehicles: presentAll(all('SELECT * FROM vehicles WHERE lat IS NOT NULL AND lng IS NOT NULL ORDER BY id')),
    });
  }));

  app.get('/nearby', requireAuth(), asyncHandler(async (req, res) => {
    const origin = coordinates(req.query.lat, req.query.lng);
    const radiusKm = Number(req.query.radiusKm);
    if (!origin || !Number.isFinite(radiusKm) || radiusKm <= 0) throw new HttpError(400, 'Invalid location query');
    const vehicles = presentAll(all('SELECT * FROM vehicles WHERE lat IS NOT NULL AND lng IS NOT NULL'))
      .map((vehicle) => ({
        ...vehicle,
        distanceKm: Number(haversineKm(origin.lat, origin.lng, vehicle.lat, vehicle.lng).toFixed(3)),
      }))
      .filter((vehicle) => vehicle.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    res.json({ origin, radiusKm, vehicles });
  }));
}
