import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getConfig } from './config.js';
import { HttpError } from './errors.js';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function checkPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    getConfig().jwtSecret,
    { expiresIn: '8h' },
  );
}

export function requireAuth(...roles) {
  return (req, _res, next) => {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return next(new HttpError(401, 'Missing token'));
    try {
      const payload = jwt.verify(token, getConfig().jwtSecret);
      if (roles.length && !roles.includes(payload.role)) return next(new HttpError(403, 'Forbidden'));
      req.user = { id: payload.sub, role: payload.role, email: payload.email };
      next();
    } catch {
      next(new HttpError(401, 'Invalid token'));
    }
  };
}
