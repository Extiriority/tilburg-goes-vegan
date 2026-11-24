import { fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/admin/auth';
import { z } from 'zod';
import { announcementInput, announcementVersion, deleteAnnouncement, saveAnnouncement } from '$lib/server/admin/announcements';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { db } = requireAdmin(event);
  const edit = event.url.searchParams.get('edit');
  type Row = { id: string; title: string; body: string; published_at: number | null; version: number; sort_order: number };
  const [list, selected] = await Promise.all([
    db.prepare('SELECT id,title,published_at,sort_order FROM announcements ORDER BY sort_order,published_at DESC,id DESC LIMIT 100')
      .all<Pick<Row, 'id' | 'title' | 'published_at' | 'sort_order'>>(),
    edit ? db.prepare('SELECT id,title,body,published_at,version,sort_order FROM announcements WHERE id=?').bind(edit).first<Row>() : null,
  ]);
  return { rows: list.results, selected, saved: event.url.searchParams.has('saved'), deleted: event.url.searchParams.has('deleted') };
};

export const actions: Actions = {
  delete: async (event) => {
    const { db } = requireAdmin(event);
    const fields = await event.request.formData();
    const id = z.uuid().safeParse(fields.get('id'));
    const version = announcementVersion.safeParse(fields.get('version'));
    if (!id.success || !version.success) return fail(400, { error: 'delete-invalid' });
    if (!await deleteAnnouncement(db, id.data, version.data)) return fail(409, { error: 'conflict' });
    redirect(303, '/admin/announcements?deleted=1');
  },
  save: async (event) => {
    const { db } = requireAdmin(event);
    const fields = await event.request.formData();
    const input = announcementInput.safeParse({
      ...Object.fromEntries(fields), published: fields.get('published') === 'on',
    });
    if (!input.success) return fail(400, { error: 'invalid' });
    const id = await saveAnnouncement(db, input.data);
    if (!id) return fail(409, { error: 'conflict' });
    redirect(303, `/admin/announcements?edit=${encodeURIComponent(id)}&saved=1`);
  },
};
