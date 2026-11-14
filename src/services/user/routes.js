import { checkPassword, hashPassword, requireAuth, signToken } from '../../shared/auth.js';
import { ROLES } from '../../shared/constants.js';
import { get, insert, present } from '../../shared/db.js';
import { asyncHandler, HttpError } from '../../shared/errors.js';
import { assertEnum, requireFields } from '../../shared/validate.js';

const USER_FIELDS = 'id, name, email, role, phone, created_at';

function readUser(id) {
  return present(get(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, id));
}

export function userRoutes(app) {
  app.post('/register', asyncHandler(async (req, res) => {
    requireFields(req.body, ['name', 'email', 'password']);
    const name = String(req.body.name).trim();
    const email = String(req.body.email).trim().toLowerCase();
    if (!name) throw new HttpError(400, 'Missing name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Invalid email');
    if (String(req.body.password).length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    const role = req.body.role || 'operator';
    assertEnum(role, ROLES, 'role');
    if (get('SELECT id FROM users WHERE email = ?', email)) throw new HttpError(409, 'Email already registered');
    const id = insert(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
      name,
      email,
      hashPassword(req.body.password),
      role,
      req.body.phone || null,
    );
    const user = readUser(id);
    res.status(201).json({ token: signToken(user), user });
  }));

  app.post('/login', asyncHandler(async (req, res) => {
    requireFields(req.body, ['email', 'password']);
    const email = String(req.body.email).trim().toLowerCase();
    const row = get('SELECT * FROM users WHERE email = ?', email);
    if (!row || !checkPassword(req.body.password, row.password_hash)) throw new HttpError(401, 'Invalid credentials');
    const user = readUser(row.id);
    res.json({ token: signToken(user), user });
  }));

  app.get('/me', requireAuth(), asyncHandler(async (req, res) => {
    const user = readUser(req.user.id);
    if (!user) throw new HttpError(401, 'Invalid token');
    res.json({ user });
  }));
}
