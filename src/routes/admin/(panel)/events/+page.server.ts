import {
  saveChefCost,
  saveChefReimbursement,
  chefCostInput,
  chefReimbursementInput,
} from '$lib/server/admin/chef-expenses';
import {
  changeParticipantStatus,
  savePayment,
  statusInput,
  paymentInput,
} from '$lib/server/admin/participant-operations';
import { adminFail } from '$lib/server/admin/feedback';
import { requireAdmin } from '$lib/server/admin/auth';
import {
  eventEdit,
  saveEvent,
  cancelEvent,
  localInput,
  AdminError,
} from '$lib/server/admin/service';
import { redirect } from '@sveltejs/kit';
import { actions as participantActions } from '../registrations/+page.server';
import {
  addWalkIn,
  editWalkIn,
  markAttendance,
  createGathering,
  walkInInput,
  walkInEdit,
  uniqueGathering,
} from '$lib/server/admin/gathering-participants';
import { z } from 'zod';
export const load = async (event: import('./$types').PageServerLoadEvent) => {
  const { db } = requireAdmin(event);
  const rows = await db
    .prepare(
      "SELECT e.*,v.name AS venue,v.address,(SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id=e.id AND status='confirmed') AS confirmed FROM events e JOIN venues v ON v.id=e.venue_id WHERE e.ends_at+604800000>? ORDER BY e.starts_at,e.id",
    )
    .bind(Date.now())
    .all<{
      id: string;
      starts_at: number;
      ends_at: number;
      status: string;
      venue: string;
      address: string;
      description: string;
      capacity: number;
      version: number;
      meal_allocation: number | null;
      confirmed: number;
    }>();
  const now = Date.now();
  const requested = event.url.searchParams.get('event');
  const selected =
    rows.results.find((r) => r.id === requested) ??
    rows.results.find((r) => r.status === 'scheduled' && r.ends_at > now) ??
    rows.results[0];
  const page = Math.max(
    1,
    Math.floor(Math.min(100000, Number(event.url.searchParams.get('page')) || 1)),
  );
  const union = `SELECT r.id,r.event_id,r.full_name,r.email_normalized,r.role,CASE WHEN n.registration_id IS NOT NULL THEN 'no_show' ELSE r.status END AS status,r.comments,r.version,r.created_at,r.paid_at,r.paid_amount_cents,r.extra_guests,r.chef_cost_cents,r.chef_reimbursed_cents,r.chef_cost_recorded_at,CASE WHEN e.ends_at+86400000>? THEN r.dietary_notes ELSE NULL END AS dietary_notes,0 AS walk_in
    FROM registrations r JOIN events e ON e.id=r.event_id LEFT JOIN registration_no_shows n ON n.registration_id=r.id WHERE r.event_id=? AND r.anonymized_at IS NULL AND e.ends_at+604800000>?
    UNION ALL SELECT w.id,w.event_id,w.full_name,NULL,'guest',w.status,w.comments,w.version,w.created_at,w.paid_at,w.paid_amount_cents,w.extra_guests,0,0,NULL,NULL,1 FROM walk_in_guests w JOIN events e ON e.id=w.event_id WHERE w.event_id=? AND e.ends_at+604800000>?`;
  const bindings = [now, selected?.id ?? '', now, selected?.id ?? '', now];
  const people = await db
    .prepare(
      `SELECT * FROM (${union}) ORDER BY CASE WHEN role='chef' THEN 0 ELSE 1 END,CASE status WHEN 'confirmed' THEN 0 WHEN 'waiting_list' THEN 1 WHEN 'undecided' THEN 2 WHEN 'no_show' THEN 3 ELSE 4 END,created_at,id LIMIT 200 OFFSET ?`,
    )
    .bind(...bindings, (page - 1) * 200)
    .all<{
      id: string;
      event_id: string;
      full_name: string;
      email_normalized: string | null;
      role: string;
      status: string;
      comments: string | null;
      version: number;
      created_at: number;
      dietary_notes: string | null;
      walk_in: number;
      paid_at: number | null;
      paid_amount_cents: number;
      extra_guests: number;
      chef_cost_cents: number;
      chef_reimbursed_cents: number;
      chef_cost_recorded_at: number | null;
    }>();
  // Count the whole gathering, independently of the visible participant page.
  const totals = await db
    .prepare(
      `SELECT status,count(*) AS records,sum(1+extra_guests) AS n FROM (${union}) GROUP BY status`,
    )
    .bind(...bindings)
    .all<{ status: string; n: number; records: number }>();
  const counts: Record<string, number> = Object.fromEntries(
    totals.results.map((row) => [row.status, row.n]),
  );
  const finance = await db
    .prepare(
      `SELECT COALESCE(sum(paid_amount_cents),0) AS received,COALESCE(sum(chef_cost_cents),0) AS costs,COALESCE(sum(chef_reimbursed_cents),0) AS reimbursed,COALESCE(sum(CASE WHEN role='chef' AND status='confirmed' AND chef_cost_recorded_at IS NULL THEN 1 ELSE 0 END),0) AS missing FROM (${union})`,
    )
    .bind(...bindings)
    .first<{ received: number; costs: number; reimbursed: number; missing: number }>();
  const mapped = rows.results.map((r) => ({
    ...r,
    // Planning budgets include every confirmed person, including volunteers.
    budget: { starter: r.confirmed * 2, main: r.confirmed * 3, dessert: r.confirmed * 2 },
    starts: localInput(r.starts_at),
    ends: localInput(r.ends_at),
  }));
  return {
    rows: mapped,
    selected: mapped.find((r) => r.id === selected?.id),
    people: people.results,
    finance: {
      received: finance!.received,
      costs: finance!.costs,
      reimbursed: finance!.reimbursed,
      outstanding: finance!.costs - finance!.reimbursed,
      balance: finance!.received - finance!.costs,
      cash: finance!.received - finance!.reimbursed,
      missing: finance!.missing,
    },
    now,
    page,
    total: totals.results.reduce((sum, row) => sum + row.records, 0),
    counts,
    submission: crypto.randomUUID(),
    gatheringSubmission: crypto.randomUUID(),
  };
};
const transition = z.object({
  id: z.string().min(1).max(100),
  version: z.coerce.number().int().min(0),
  ack: z.literal('on'),
});
export const actions = {
  chefCost: async (event) => {
    const { db, admin } = requireAdmin(event);
    const parsed = chefCostInput.safeParse(Object.fromEntries(await event.request.formData()));
    if (!parsed.success) return adminFail(event.locals.locale, 400, 'Check the chef cost amount.');
    try {
      await saveChefCost(db, admin.id, parsed.data);
      return { saved: true };
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not save.',
      );
    }
  },
  chefReimbursement: async (event) => {
    const { db, admin } = requireAdmin(event);
    const parsed = chefReimbursementInput.safeParse(
      Object.fromEntries(await event.request.formData()),
    );
    if (!parsed.success) return adminFail(event.locals.locale, 400, 'Check the reimbursement.');
    try {
      await saveChefReimbursement(db, admin.id, parsed.data);
      return { saved: true };
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not save.',
      );
    }
  },
  status: async (event) => {
    const { db, admin } = requireAdmin(event);
    const parsed = statusInput.safeParse(Object.fromEntries(await event.request.formData()));
    if (!parsed.success) return adminFail(event.locals.locale, 400, 'Check the status fields.');
    try {
      await changeParticipantStatus(db, admin.id, parsed.data);
      return { saved: true };
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not save.',
      );
    }
  },
  payment: async (event) => {
    const { db, admin } = requireAdmin(event);
    const parsed = paymentInput.safeParse(Object.fromEntries(await event.request.formData()));
    if (!parsed.success) return adminFail(event.locals.locale, 400, 'Check the payment amount.');
    try {
      await savePayment(db, admin.id, parsed.data);
      return { saved: true };
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not save.',
      );
    }
  },
  personSave: participantActions.save,
  personCancel: participantActions.cancel,
  promote: participantActions.promote,
  addPerson: async (event) => {
    const { db, admin } = requireAdmin(event);
    const parsed = walkInInput.safeParse(Object.fromEntries(await event.request.formData()));
    if (!parsed.success)
      return adminFail(event.locals.locale, 400, 'Check the name and override confirmation.');
    try {
      await addWalkIn(db, admin.id, parsed.data);
      return { saved: true };
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not save.',
      );
    }
  },
  walkInSave: async (event) => {
    const { db, admin } = requireAdmin(event);
    const parsed = walkInEdit.safeParse(Object.fromEntries(await event.request.formData()));
    if (!parsed.success) return adminFail(event.locals.locale, 400, 'Check the name and comments.');
    try {
      await editWalkIn(db, admin.id, parsed.data);
      return { saved: true };
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not save.',
      );
    }
  },
  attendance: async (event) => {
    const { db, admin } = requireAdmin(event);
    const body = Object.fromEntries(await event.request.formData());
    const parsed = transition.safeParse(body);
    if (!parsed.success || !['no_show', 'cancelled'].includes(String(body.status)))
      return adminFail(event.locals.locale, 400, 'Confirm the status change first.');
    if (body.status === 'cancelled' && !parsed.data.id.startsWith('walk-in:'))
      return adminFail(event.locals.locale, 400, 'Invalid status change.');
    try {
      await markAttendance(
        db,
        admin.id,
        parsed.data.id,
        parsed.data.version,
        body.status === 'no_show',
      );
      return { saved: true };
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not save.',
      );
    }
  },
  create: async (event) => {
    const { db, admin } = requireAdmin(event);
    const parsed = uniqueGathering.safeParse(Object.fromEntries(await event.request.formData()));
    if (!parsed.success) return adminFail(event.locals.locale, 400, 'Check the gathering fields.');
    let id: string;
    try {
      id = await createGathering(db, admin.id, parsed.data);
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not save.',
      );
    }
    redirect(303, '/admin/events?event=' + encodeURIComponent(id));
  },
  save: async (event) => {
    const { db, admin } = requireAdmin(event);
    const p = eventEdit.safeParse(Object.fromEntries(await event.request.formData()));
    if (!p.success) return adminFail(event.locals.locale, 400, 'Check the gathering fields.');
    try {
      await saveEvent(db, admin.id, p.data);
      return { saved: true };
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not save.',
      );
    }
  },
  cancel: async (event) => {
    const { db, admin } = requireAdmin(event);
    const p = z
      .object({
        id: z.string().min(1).max(100),
        version: z.coerce.number().int().min(0),
        ack: z.literal('on'),
      })
      .safeParse(Object.fromEntries(await event.request.formData()));
    if (!p.success) return adminFail(event.locals.locale, 400, 'Confirm cancellation first.');
    try {
      await cancelEvent(db, admin.id, p.data.id, p.data.version);
      return { saved: true };
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not cancel.',
      );
    }
  },
} satisfies import('./$types').Actions;
