import { adminFail } from '$lib/server/admin/feedback';
import { requireAdmin } from '$lib/server/admin/auth';
import {
  registrationEdit,
  editRegistration,
  cancelRegistration,
  promoteManually,
  AdminError,
} from '$lib/server/admin/service';
import { redirect } from '@sveltejs/kit';
import { z } from 'zod';
export const load = async (event: import('./$types').PageServerLoadEvent) => {
  const { db } = requireAdmin(event);
  redirect(303, '/admin/events' + event.url.search);
};
const transition = z.object({
  id: z.string().min(1).max(100),
  version: z.coerce.number().int().min(0),
  ack: z.literal('on'),
});
export const actions = {
  save: async (event: import('@sveltejs/kit').RequestEvent) => {
    const { db, admin } = requireAdmin(event);
    const p = registrationEdit.safeParse(Object.fromEntries(await event.request.formData()));
    if (!p.success)
      return adminFail(event.locals.locale, 400, 'Check the name, email, role and comments.');
    try {
      await editRegistration(db, admin.id, p.data);
      return { saved: true };
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not save.',
      );
    }
  },
  cancel: async (event: import('@sveltejs/kit').RequestEvent) => {
    const { db, admin } = requireAdmin(event);
    const p = transition.safeParse(Object.fromEntries(await event.request.formData()));
    if (!p.success) return adminFail(event.locals.locale, 400, 'Confirm cancellation first.');
    try {
      await cancelRegistration(db, admin.id, p.data.id, p.data.version);
      return { saved: true };
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not cancel.',
      );
    }
  },
  promote: async (event: import('@sveltejs/kit').RequestEvent) => {
    const { db, admin } = requireAdmin(event);
    const p = transition.safeParse(Object.fromEntries(await event.request.formData()));
    if (!p.success)
      return adminFail(event.locals.locale, 400, 'Confirm that you contacted this person.');
    try {
      await promoteManually(db, admin.id, p.data.id, p.data.version, true);
      return { saved: true };
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not promote.',
      );
    }
  },
} satisfies import('./$types').Actions;
