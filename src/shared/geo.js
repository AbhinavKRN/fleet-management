import { HttpError } from './errors.js';

const EARTH_KM = 6371;

function radians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function coordinates(lat, lng) {
  if (lat === undefined || lng === undefined || lat === '' || lng === '') return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  const valid = Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
  if (!valid) throw new HttpError(400, 'Invalid coordinates');
  return { lat: latitude, lng: longitude };
}
