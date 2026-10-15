import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '$lib/server/admin/auth';
import type { Actions } from './$types';
export const actions: Actions = {
  default: async (event) => {
    requireAdmin(event);
    const form = await event.request.formData();
    const language = z.enum(['en','nl']).safeParse(form.get('language'));
    if (!language.success) return fail(400);
    event.cookies.set('language', language.data, {path:'/',httpOnly:true,sameSite:'lax',secure:event.url.protocol==='https:',maxAge:365*24*60*60});
    if (event.request.headers.get('x-sveltekit-action') === 'true') return {language:language.data};
    const target = new URL(String(form.get('returnTo') ?? '/admin'),event.url);
    redirect(303,target.origin===event.url.origin && (target.pathname==='/admin' || target.pathname.startsWith('/admin/')) ? target.pathname+target.search : '/admin');
  },
};
