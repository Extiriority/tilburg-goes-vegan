import { z } from 'zod';
import { audit, batch, receipt } from './service';
const SQL_NOW = "CAST(strftime('%s','now') AS INTEGER)*1000";
const identity = { id: z.string().min(1).max(100), version: z.coerce.number().int().min(0) };
export const chefCostInput = z.object({
  ...identity,
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,5}(?:[.,]\d{1,2})?$/),
});
export const chefReimbursementInput = z.object({
  ...identity,
  reimbursed: z.literal('on').optional(),
});
const eligible = `(role='chef' OR chef_cost_recorded_at IS NOT NULL OR chef_reimbursed_cents>0) AND EXISTS(SELECT 1 FROM events WHERE id=event_id AND ends_at+604800000>MAX(?,${SQL_NOW}))`;
export async function saveChefCost(
  db: D1Database,
  admin: string,
  input: z.infer<typeof chefCostInput>,
  now = Date.now(),
) {
  const [whole, decimal = ''] = input.amount.replace(',', '.').split('.');
  const amount = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  const table = input.id.startsWith('walk-in:') ? 'walk_in_guests' : 'registrations';
  await batch(db, [
    db
      .prepare(
        `UPDATE ${table} SET chef_cost_cents=?,chef_cost_recorded_at=?,version=version+1,updated_at=? WHERE id=? AND version=? ${table === 'registrations' ? 'AND anonymized_at IS NULL' : ''} AND ${eligible}`,
      )
      .bind(amount, now, now, input.id, input.version, now),
    receipt(db, now),
    audit(db, admin, null, 'chef_cost_recorded', now),
  ]);
}
export async function saveChefReimbursement(
  db: D1Database,
  admin: string,
  input: z.infer<typeof chefReimbursementInput>,
  now = Date.now(),
) {
  const table = input.id.startsWith('walk-in:') ? 'walk_in_guests' : 'registrations';
  await batch(db, [
    db
      .prepare(
        `UPDATE ${table} SET chef_reimbursed_cents=CASE WHEN ?=1 THEN chef_cost_cents ELSE 0 END,version=version+1,updated_at=? WHERE id=? AND version=? AND chef_cost_recorded_at IS NOT NULL AND (?=0 OR chef_cost_cents>0) ${table === 'registrations' ? 'AND anonymized_at IS NULL' : ''} AND ${eligible}`,
      )
      .bind(input.reimbursed ? 1 : 0, now, input.id, input.version, input.reimbursed ? 1 : 0, now),
    receipt(db, now),
    audit(
      db,
      admin,
      null,
      input.reimbursed ? 'chef_reimbursed' : 'chef_reimbursement_unchecked',
      now,
    ),
  ]);
}
