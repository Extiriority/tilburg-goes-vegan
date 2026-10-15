import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { login } from '$lib/server/admin/auth';
export const load = () => {
  if (!import.meta.env.DEV) error(404, 'Not found');
  return {};
};
export const actions = {
  default: async (event) => {
    if (!import.meta.env.DEV || !event.platform?.env.DB) error(404, 'Not found');
    const parsed = z
      .object({ email: z.email().max(254), password: z.string().min(1).max(256) })
      .safeParse(Object.fromEntries(await event.request.formData()));
    if (!parsed.success) return fail(400, { invalid: true });
    const token = await login(event.platform.env.DB, parsed.data.email, parsed.data.password);
    if (!token) return fail(400, { invalid: true });
    event.cookies.set('tgv_admin', token, {
      path: '/admin',
      httpOnly: true,
      secure: event.url.protocol === 'https:',
      sameSite: 'strict',
    });
    redirect(303, '/admin');
  },
} satisfies import('./$types').Actions;
