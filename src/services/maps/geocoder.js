import { getConfig } from '../../shared/config.js';
import { HttpError } from '../../shared/errors.js';

const FIXTURES = {
  '1 market street, san francisco': {
    lat: 37.7936,
    lng: -122.3958,
    displayName: '1 Market Street, San Francisco',
  },
};

function mockGeocode(address) {
  const key = address.trim().toLowerCase();
  if (FIXTURES[key]) return { ...FIXTURES[key] };
  let hash = 0;
  for (const char of key) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return {
    lat: Number((37.7 + (hash % 1000) / 10000).toFixed(6)),
    lng: Number((-122.5 + ((hash >>> 10) % 1000) / 10000).toFixed(6)),
    displayName: address,
  };
}

async function nominatimGeocode(address) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', address);
  let response;
  try {
    response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'fleet-management-assignment/1.0',
      },
    });
  } catch {
    throw new HttpError(503, 'Geocoder unavailable');
  }
  if (!response.ok) throw new HttpError(503, 'Geocoder unavailable');
  const rows = await response.json();
  if (!rows.length) throw new HttpError(404, 'Address not found');
  return {
    lat: Number(rows[0].lat),
    lng: Number(rows[0].lon),
    displayName: rows[0].display_name,
  };
}

export function geocode(address) {
  if (getConfig().geocoder === 'mock') return mockGeocode(address);
  return nominatimGeocode(address);
}
