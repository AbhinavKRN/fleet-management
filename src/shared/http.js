import { HttpError } from './errors.js';

export async function requestJson(url, { method = 'GET', body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new HttpError(503, 'Service unavailable');
  }
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new HttpError(response.ok ? 502 : response.status, 'Invalid upstream response');
    }
  }
  if (!response.ok) throw new HttpError(response.status, data.error || 'Upstream error');
  return data;
}
