import { requireAdmin, hashSession } from '$lib/server/admin/auth';
import { redirect } from '@sveltejs/kit';
export const POST = async (event: import('./$types').RequestEvent) => {
  const { db } = requireAdmin(event);
  await db
    .prepare('DELETE FROM admin_sessions WHERE session_hash=?')
    .bind(await hashSession(event.cookies.get('tgv_admin') ?? ''))
    .run();
  event.cookies.delete('tgv_admin', { path: '/admin' });
  redirect(303, '/admin/login');
};
