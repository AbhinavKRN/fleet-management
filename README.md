# Fleet Management System

Express services behind one API gateway: users, vehicles, telemetry, OpenStreetMap geocoding, and an SMS stub. SQLite stores vehicles, GPS history, and notification status. Swagger UI documents the gateway.

Node.js 22 or newer is required (`node:sqlite`).

## Run

```bash
cd fleet-management
npm install
copy .env.example .env
npm start
```

On macOS or Linux, use `cp .env.example .env`. Environment variables already set in the shell win over `.env`.

- Map: http://127.0.0.1:4000/
- Swagger UI: http://127.0.0.1:4000/api/docs
- OpenAPI document: http://127.0.0.1:4000/api/openapi.json

The default API key is `fleet-dev-key`, sent as `x-api-key`. Protected routes also need `Authorization: Bearer <token>`.

On the map page, choose **Load demo fleet**. That registers:

| Email | Password | Role |
| --- | --- | --- |
| admin@fleet.local | admin12345 | admin, phone +15551230000 |
| dispatch@fleet.local | admin12345 | admin, no phone (SMS is recorded as failed) |
| operator@fleet.local | operator123 | operator |

Sign in as the operator. The map shows three San Francisco vehicles. **Find nearby** uses a 2 km radius, so SF-1900 stays outside it. **Send telemetry** with an engine fault writes an SMS row for each admin. **Check gateway** calls `POST /api/users/login` twice: once without a key (401 from the gateway) and once with a key (forwarded to the user service).

## Tests

```bash
npm test
```

Mocha and Chai boot the gateway against a temporary database and the offline geocoder (`GEOCODER=mock`). The suite covers:

1. User login and JWT verification
2. Vehicle registration, geocoding, and retrieval
3. Telemetry submission and storage
4. Status updates and critical events, including sent and failed SMS rows
5. Role-based deletion (operator forbidden, admin allowed)
6. Nearby search with the mock geocoder
7. API key checks, invalid JSON, rate limiting, and a down upstream (503)

`RATE_LIMIT_MAX` defaults to 100 requests per minute per API key. Tests lower it to 3.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | random in tests, set `4000` to match the URLs above | Gateway port |
| `API_KEYS` | `fleet-dev-key` | Comma-separated keys accepted by the gateway |
| `JWT_SECRET` | `dev-only-secret` | HMAC secret for login tokens (8 hour expiry) |
| `GEOCODER` | `nominatim` | `nominatim` calls OpenStreetMap; `mock` stays offline |
| `SMS_FAIL` | `0` | `1` forces every SMS stub attempt to `failed` |
| `DATABASE_PATH` | `data/fleet.db` | SQLite file |
| `RATE_LIMIT_MAX` | `100` | Requests allowed per key inside the window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window |

`GEOCODER=nominatim` needs outbound HTTPS. Use `GEOCODER=mock` when you want the demo address "1 Market Street, San Francisco" to resolve to 37.7936, -122.3958 without the network.

## Layout

The gateway checks the API key and rate limit, then forwards `/api/users`, `/api/vehicles`, `/api/telemetry`, `/api/maps`, and `/api/notifications` to five HTTP servers in the same process. JWT roles are enforced in those services. Vehicle registration calls the map service when an address has no coordinates. Status changes and critical telemetry (`engine_fault`, `low_battery`, `emergency_stop`) call the notification service, which writes one row per administrator.

Screenshots of the map, SMS log, gateway check, and Swagger UI are in [docs/screenshots](docs/screenshots).
