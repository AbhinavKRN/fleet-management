import { requireAuth } from '../../shared/auth.js';
import { NOTIFICATION_EVENTS } from '../../shared/constants.js';
import { all, get, insert, present, presentAll } from '../../shared/db.js';
import { asyncHandler } from '../../shared/errors.js';
import { assertEnum, requireFields } from '../../shared/validate.js';
import { deliverSms } from './sms.js';

export function notificationRoutes(app) {
  app.post('/', requireAuth('admin', 'operator'), asyncHandler(async (req, res) => {
    requireFields(req.body, ['eventType', 'message']);
    assertEnum(req.body.eventType, NOTIFICATION_EVENTS, 'eventType');
    const admins = all(`SELECT phone FROM users WHERE role = 'admin'`);
    const recipients = admins.length ? admins : [{ phone: '' }];
    const notifications = recipients.map((admin) => {
      const result = deliverSms({ to: admin.phone, body: req.body.message });
      const id = insert(
        'INSERT INTO notifications (vehicle_id, phone, message, event_type, status) VALUES (?, ?, ?, ?, ?)',
        req.body.vehicleId ?? null,
        admin.phone || '',
        req.body.message,
        req.body.eventType,
        result.status,
      );
      return present(get('SELECT * FROM notifications WHERE id = ?', id));
    });
    res.status(201).json({ notifications });
  }));

  app.get('/', requireAuth(), asyncHandler(async (_req, res) => {
    res.json({ notifications: presentAll(all('SELECT * FROM notifications ORDER BY id DESC')) });
  }));
}
