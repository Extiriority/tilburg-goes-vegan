import { error, redirect, type RequestEvent } from '@sveltejs/kit';

const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
export const hashSession = async (value: string) =>
  hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));

import { hashPassword } from './password.ts';
export { hashPassword } from './password.ts';
export async function verifyPassword(password: string, stored: string) {
  if (!/^pbkdf2-sha512:100000:[a-f0-9]{32}:[a-f0-9]{64}$/.test(stored)) return false;
  const salt = Uint8Array.from(stored.split(':')[2].match(/../g)!, (x) => parseInt(x, 16));
  const actual = await hashPassword(password, salt);
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ stored.charCodeAt(i);
  return difference === 0;
}

export async function login(db: D1Database, email: string, password: string, now = Date.now()) {
  // A persistent global limit is suitable for the one shared organizer account.
  const window = Math.floor(now / 900000) * 900000;
  const attempt = await db
    .prepare(
      `INSERT INTO admin_login_limits (id,window_start,attempts) VALUES (1,?,1)
    ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN window_start=excluded.window_start THEN attempts+1 ELSE 1 END,window_start=excluded.window_start
    RETURNING attempts`,
    )
    .bind(window)
    .first<{ attempts: number }>();
  if (!attempt || attempt.attempts > 5) return null;
  const user = await db
    .prepare('SELECT id,password_hash FROM admin_users WHERE email=?')
    .bind(email.trim().toLowerCase())
    .first<{ id: string; password_hash: string }>();
  const dummy = 'pbkdf2-sha512:100000:' + '00'.repeat(16) + ':' + '00'.repeat(32);
  const valid = await verifyPassword(password, user?.password_hash ?? dummy);
  if (!valid || !user) return null;
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  await db
    .prepare(
      'INSERT INTO admin_sessions (id,admin_id,session_hash,expires_at,created_at) VALUES (?,?,?,?,?)',
    )
    .bind(crypto.randomUUID(), user.id, await hashSession(token), now + 86400000, now)
    .run();
  return token;
}

export async function resolveAdmin(db: D1Database, token: string | undefined, now = Date.now()) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return db
    .prepare(
      `SELECT u.id,u.email FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_id
    WHERE s.session_hash=? AND s.expires_at>MAX(?,CAST(strftime('%s','now') AS INTEGER)*1000)`,
    )
    .bind(await hashSession(token), now)
    .first<{ id: string; email: string }>();
}

export function requireAdmin(event: RequestEvent) {
  if (!import.meta.env.DEV || !event.platform?.env.DB) error(404, 'Not found');
  if (!event.locals.admin) redirect(303, '/admin/login');
  return { db: event.platform.env.DB, admin: event.locals.admin };
}
