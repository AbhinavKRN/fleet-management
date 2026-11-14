export const ROLES = ['admin', 'operator', 'viewer'];
export const STATUSES = ['active', 'idle', 'maintenance', 'out_of_service'];
export const CRITICAL_EVENTS = ['engine_fault', 'low_battery', 'emergency_stop'];
export const EVENTS = ['location_update', ...CRITICAL_EVENTS];
export const NOTIFICATION_EVENTS = [...CRITICAL_EVENTS, 'status_change'];
