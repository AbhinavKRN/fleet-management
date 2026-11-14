import { EVENTS, NOTIFICATION_EVENTS, ROLES, STATUSES } from './shared/constants.js';

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

function json(schema, example) {
  return { 'application/json': { schema, ...(example === undefined ? {} : { example }) } };
}

function failure(description) {
  return { description, content: json(ref('Error'), { error: description }) };
}

function operation({ tag, summary, security, body, params = [], query = [], success, errors = [] }) {
  const spec = {
    tags: [tag],
    summary,
    security,
    responses: {
      [success.status]: {
        description: success.description,
        ...(success.schema ? { content: json(success.schema, success.example) } : {}),
      },
    },
  };
  if (body) spec.requestBody = { required: true, content: json(body.schema, body.example) };
  if (params.length || query.length) {
    spec.parameters = [
      ...params.map((name) => ({ name, in: 'path', required: true, schema: { type: 'integer' } })),
      ...query.map((parameter) => ({
        name: parameter.name,
        in: 'query',
        required: parameter.required !== false,
        description: parameter.description,
        schema: parameter.schema || { type: 'string' },
      })),
    ];
  }
  for (const item of errors) {
    const current = spec.responses[item.status];
    const previous = current?.content?.['application/json']?.example?.error;
    spec.responses[item.status] = failure(previous ? `${previous}; ${item.description}` : item.description);
  }
  return spec;
}

const apiKey = [{ ApiKeyAuth: [] }];
const both = [{ ApiKeyAuth: [], BearerAuth: [] }];
const user = {
  id: 1,
  name: 'Ada Fleet',
  email: 'ada@fleet.test',
  role: 'operator',
  phone: '+15551230000',
  createdAt: '2026-11-15 06:00:00',
};
const vehicle = {
  id: 1,
  plate: 'SF-1001',
  make: 'Ford',
  model: 'Transit',
  address: '1 Market Street, San Francisco',
  lat: 37.7936,
  lng: -122.3958,
  status: 'active',
  updatedAt: '2026-11-15 06:00:00',
};
const telemetry = {
  id: 1,
  vehicleId: 1,
  lat: 37.79,
  lng: -122.4,
  speed: 42,
  battery: 18,
  eventType: 'engine_fault',
  createdAt: '2026-11-15 06:05:00',
};
const notification = {
  id: 1,
  vehicleId: 1,
  phone: '+15551230000',
  message: 'Vehicle SF-1001 reported engine fault',
  eventType: 'engine_fault',
  status: 'sent',
  createdAt: '2026-11-15 06:05:00',
};

const keyErrors = [{ status: 401, description: 'Invalid API key' }, { status: 429, description: 'Too many requests' }];
const authErrors = [...keyErrors, { status: 401, description: 'Missing token' }, { status: 403, description: 'Forbidden' }];

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Fleet Management API',
    version: '1.0.0',
    description: 'Gateway surface for users, vehicles, telemetry, geolocation, and SMS notifications. Send x-api-key on every /api call except the documentation. Send Authorization: Bearer <jwt> on protected operations. Roles are admin, operator, and viewer. Deleting a vehicle requires admin. Creating vehicles, updating status, and submitting telemetry require admin or operator.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Users' },
    { name: 'Vehicles' },
    { name: 'Telemetry' },
    { name: 'Maps' },
    { name: 'Notifications' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
      BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: { type: 'object', required: ['error'], properties: { error: { type: 'string' } } },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ROLES },
          phone: { type: 'string', nullable: true },
          createdAt: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: { token: { type: 'string' }, user: ref('User') },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          role: { type: 'string', enum: ROLES },
          phone: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string' }, password: { type: 'string' } },
      },
      Vehicle: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          plate: { type: 'string' },
          make: { type: 'string', nullable: true },
          model: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          lat: { type: 'number', nullable: true },
          lng: { type: 'number', nullable: true },
          status: { type: 'string', enum: STATUSES },
          updatedAt: { type: 'string' },
        },
      },
      VehicleInput: {
        type: 'object',
        required: ['plate'],
        properties: {
          plate: { type: 'string' },
          make: { type: 'string' },
          model: { type: 'string' },
          address: { type: 'string' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          status: { type: 'string', enum: STATUSES },
        },
      },
      StatusUpdate: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', enum: STATUSES } },
      },
      VehicleList: { type: 'object', properties: { vehicles: { type: 'array', items: ref('Vehicle') } } },
      VehicleResponse: { type: 'object', properties: { vehicle: ref('Vehicle') } },
      Telemetry: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          vehicleId: { type: 'integer' },
          lat: { type: 'number', nullable: true },
          lng: { type: 'number', nullable: true },
          speed: { type: 'number', nullable: true },
          battery: { type: 'number', nullable: true },
          eventType: { type: 'string', enum: EVENTS },
          createdAt: { type: 'string' },
        },
      },
      TelemetryInput: {
        type: 'object',
        required: ['vehicleId', 'eventType'],
        properties: {
          vehicleId: { type: 'integer' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          speed: { type: 'number' },
          battery: { type: 'number' },
          eventType: { type: 'string', enum: EVENTS },
        },
      },
      TelemetryResponse: { type: 'object', properties: { telemetry: ref('Telemetry') } },
      TelemetryList: { type: 'object', properties: { telemetry: { type: 'array', items: ref('Telemetry') } } },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          vehicleId: { type: 'integer', nullable: true },
          phone: { type: 'string' },
          message: { type: 'string' },
          eventType: { type: 'string', enum: NOTIFICATION_EVENTS },
          status: { type: 'string', enum: ['sent', 'failed'] },
          createdAt: { type: 'string' },
        },
      },
      NotificationRequest: {
        type: 'object',
        required: ['eventType', 'message'],
        properties: {
          vehicleId: { type: 'integer' },
          eventType: { type: 'string', enum: NOTIFICATION_EVENTS },
          message: { type: 'string' },
        },
      },
      NotificationList: { type: 'object', properties: { notifications: { type: 'array', items: ref('Notification') } } },
      GeocodeResult: {
        type: 'object',
        properties: {
          lat: { type: 'number' },
          lng: { type: 'number' },
          displayName: { type: 'string' },
        },
      },
      NearbyVehicle: {
        allOf: [ref('Vehicle'), { type: 'object', properties: { distanceKm: { type: 'number' } } }],
      },
      NearbyResult: {
        type: 'object',
        properties: {
          origin: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } },
          radiusKm: { type: 'number' },
          vehicles: { type: 'array', items: ref('NearbyVehicle') },
        },
      },
    },
  },
  paths: {
    '/api/users/register': {
      post: operation({
        tag: 'Users',
        summary: 'Register a fleet user',
        security: apiKey,
        body: {
          schema: ref('RegisterRequest'),
          example: { name: 'Ada Fleet', email: 'ada@fleet.test', password: 'secret12', role: 'operator', phone: '+15551230000' },
        },
        success: { status: 201, description: 'User created', schema: ref('AuthResponse'), example: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', user } },
        errors: [...keyErrors, { status: 400, description: 'Missing name' }, { status: 409, description: 'Email already registered' }],
      }),
    },
    '/api/users/login': {
      post: operation({
        tag: 'Users',
        summary: 'Login and receive a JWT',
        security: apiKey,
        body: { schema: ref('LoginRequest'), example: { email: 'ada@fleet.test', password: 'secret12' } },
        success: { status: 200, description: 'Authenticated', schema: ref('AuthResponse'), example: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', user } },
        errors: [...keyErrors, { status: 400, description: 'Missing email' }, { status: 401, description: 'Invalid credentials' }],
      }),
    },
    '/api/users/me': {
      get: operation({
        tag: 'Users',
        summary: 'Read the current user from the JWT',
        security: both,
        success: { status: 200, description: 'Current user', schema: { type: 'object', properties: { user: ref('User') } }, example: { user } },
        errors: authErrors,
      }),
    },
    '/api/vehicles': {
      post: operation({
        tag: 'Vehicles',
        summary: 'Register a vehicle and geocode its address when coordinates are omitted',
        security: both,
        body: { schema: ref('VehicleInput'), example: { plate: 'SF-1001', make: 'Ford', model: 'Transit', address: '1 Market Street, San Francisco' } },
        success: { status: 201, description: 'Vehicle created', schema: ref('VehicleResponse'), example: { vehicle } },
        errors: [...authErrors, { status: 400, description: 'Address or coordinates required' }, { status: 409, description: 'Plate already registered' }],
      }),
      get: operation({
        tag: 'Vehicles',
        summary: 'List vehicles',
        security: both,
        success: { status: 200, description: 'Vehicle list', schema: ref('VehicleList'), example: { vehicles: [vehicle] } },
        errors: authErrors,
      }),
    },
    '/api/vehicles/{id}': {
      get: operation({
        tag: 'Vehicles',
        summary: 'Retrieve one vehicle',
        security: both,
        params: ['id'],
        success: { status: 200, description: 'Vehicle', schema: ref('VehicleResponse'), example: { vehicle } },
        errors: [...authErrors, { status: 404, description: 'Vehicle not found' }],
      }),
      delete: operation({
        tag: 'Vehicles',
        summary: 'Delete a vehicle (admin only)',
        security: both,
        params: ['id'],
        success: { status: 204, description: 'Vehicle deleted' },
        errors: [...authErrors, { status: 404, description: 'Vehicle not found' }],
      }),
    },
    '/api/vehicles/{id}/status': {
      patch: operation({
        tag: 'Vehicles',
        summary: 'Update operational status and notify administrators',
        security: both,
        params: ['id'],
        body: { schema: ref('StatusUpdate'), example: { status: 'maintenance' } },
        success: { status: 200, description: 'Status updated', schema: ref('VehicleResponse'), example: { vehicle: { ...vehicle, status: 'maintenance' } } },
        errors: [...authErrors, { status: 400, description: 'Invalid status' }, { status: 404, description: 'Vehicle not found' }],
      }),
    },
    '/api/telemetry': {
      post: operation({
        tag: 'Telemetry',
        summary: 'Store a telemetry report and SMS administrators for a critical event',
        security: both,
        body: { schema: ref('TelemetryInput'), example: { vehicleId: 1, lat: 37.79, lng: -122.4, speed: 42, battery: 18, eventType: 'engine_fault' } },
        success: { status: 201, description: 'Telemetry stored', schema: ref('TelemetryResponse'), example: { telemetry } },
        errors: [...authErrors, { status: 400, description: 'Invalid eventType' }, { status: 404, description: 'Vehicle not found' }],
      }),
    },
    '/api/telemetry/{vehicleId}': {
      get: operation({
        tag: 'Telemetry',
        summary: 'Read stored telemetry for a vehicle',
        security: both,
        params: ['vehicleId'],
        success: { status: 200, description: 'Telemetry history', schema: ref('TelemetryList'), example: { telemetry: [telemetry] } },
        errors: [...authErrors, { status: 404, description: 'Vehicle not found' }],
      }),
    },
    '/api/maps/geocode': {
      get: operation({
        tag: 'Maps',
        summary: 'Geocode an address with OpenStreetMap or the offline mock',
        security: both,
        query: [{ name: 'address', description: 'Street address' }],
        success: { status: 200, description: 'Coordinates', schema: ref('GeocodeResult'), example: { lat: 37.7936, lng: -122.3958, displayName: '1 Market Street, San Francisco' } },
        errors: [...authErrors, { status: 400, description: 'Missing address' }, { status: 404, description: 'Address not found' }],
      }),
    },
    '/api/maps/vehicles': {
      get: operation({
        tag: 'Maps',
        summary: 'List vehicles that have coordinates',
        security: both,
        success: { status: 200, description: 'Mappable vehicles', schema: ref('VehicleList'), example: { vehicles: [vehicle] } },
        errors: authErrors,
      }),
    },
    '/api/maps/nearby': {
      get: operation({
        tag: 'Maps',
        summary: 'Find vehicles within a radius in kilometres',
        security: both,
        query: [
          { name: 'lat', description: 'Origin latitude', schema: { type: 'number' } },
          { name: 'lng', description: 'Origin longitude', schema: { type: 'number' } },
          { name: 'radiusKm', description: 'Search radius in kilometres', schema: { type: 'number' } },
        ],
        success: {
          status: 200,
          description: 'Vehicles inside the radius, nearest first',
          schema: ref('NearbyResult'),
          example: { origin: { lat: 37.7936, lng: -122.3958 }, radiusKm: 2, vehicles: [{ ...vehicle, distanceKm: 0 }] },
        },
        errors: [...authErrors, { status: 400, description: 'Invalid location query' }],
      }),
    },
    '/api/notifications': {
      post: operation({
        tag: 'Notifications',
        summary: 'Send an SMS stub to fleet administrators and record sent or failed',
        security: both,
        body: { schema: ref('NotificationRequest'), example: { vehicleId: 1, eventType: 'engine_fault', message: 'Vehicle SF-1001 reported engine fault' } },
        success: { status: 201, description: 'Notification attempts', schema: ref('NotificationList'), example: { notifications: [notification] } },
        errors: [...authErrors, { status: 400, description: 'Invalid eventType' }],
      }),
      get: operation({
        tag: 'Notifications',
        summary: 'List notification attempts',
        security: both,
        success: { status: 200, description: 'Notification log', schema: ref('NotificationList'), example: { notifications: [notification, { ...notification, id: 2, phone: '', status: 'failed' }] } },
        errors: authErrors,
      }),
    },
  },
};
