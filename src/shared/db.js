import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plate TEXT NOT NULL UNIQUE,
  make TEXT,
  model TEXT,
  address TEXT,
  lat REAL,
  lng REAL,
  status TEXT NOT NULL DEFAULT 'active',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS telemetry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  lat REAL,
  lng REAL,
  speed REAL,
  battery REAL,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  phone TEXT,
  message TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle ON telemetry(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_notifications_vehicle ON notifications(vehicle_id);
`;

let database;

export function openDb(file) {
  closeDb();
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  database = new DatabaseSync(file);
  database.exec(SCHEMA);
  return database;
}

export function closeDb() {
  if (!database) return;
  database.close();
  database = null;
}

function db() {
  if (!database) throw new Error('Database is not open');
  return database;
}

export function get(sql, ...params) {
  return db().prepare(sql).get(...params);
}

export function all(sql, ...params) {
  return db().prepare(sql).all(...params);
}

export function run(sql, ...params) {
  return db().prepare(sql).run(...params);
}

export function insert(sql, ...params) {
  return Number(run(sql, ...params).lastInsertRowid);
}

export function present(record) {
  if (!record) return record;
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
    value,
  ]));
}

export function presentAll(records) {
  return records.map((record) => present(record));
}
