import { requestJson } from './http.js';
import { urls } from './urls.js';

export function notify(authorization, payload) {
  return requestJson(urls.notifications, {
    method: 'POST',
    headers: { authorization },
    body: payload,
  });
}

export function lookupAddress(authorization, address) {
  return requestJson(`${urls.maps}/geocode?${new URLSearchParams({ address })}`, {
    headers: { authorization },
  });
}
