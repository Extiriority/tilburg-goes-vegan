import { readFileSync,readdirSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { beforeEach,afterEach,it,expect } from 'vitest';
import { freezeMealAllocation,promoteWaitingList,mondayStartsAt } from '../src/lib/server/events/waiting-list';
import { changeRegistration } from '../src/lib/server/registrations/service';
import { managementToken,hashToken } from '../src/lib/server/registrations/tokens';

const starts=Date.parse('2026-10-26T18:00:00Z');
const cutoff=Date.parse('2026-10-24T14:00:00Z');
const secret='test-only-waiting-list-secret-123456789';
let mf:Miniflare;
let db:D1Database;
let clock:number;
let timed:D1Database;
beforeEach(async()=>{
  mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2025-10-11',d1Databases:['DB']});
  db=await mf.getD1Database('DB') as unknown as D1Database;
  for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()) for(const sql of readFileSync(`drizzle/${file}`,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean)) await db.prepare(sql).run();
  await db.prepare("INSERT INTO events (id,occurrence_key,slug,starts_at,ends_at,venue_id,capacity,registration_cutoff,created_at) VALUES ('e','2026-10-26','waitlist-test',?,?,'tgv-v39',30,?,0)").bind(starts,starts+10800000,cutoff).run();
  clock=cutoff-1000;
  timed={prepare:(sql:string)=>db.prepare(sql.replaceAll("CAST(strftime('%s','now') AS INTEGER) * 1000",String(clock))),batch:(s:D1PreparedStatement[])=>db.batch(s)} as D1Database;
});
afterEach(async()=>{await mf?.dispose();});
const signup=(id:string,status='confirmed',role='guest',created=1)=>db.prepare("INSERT INTO registrations (id,event_id,email_normalized,full_name,role,status,language,created_at,updated_at) VALUES (?,'e',?,'Synthetic waiter',?,?,'nl',?,0)").bind(id,`${id}@example.invalid`,role,status,created).run();
const count=async(table:string,where='1=1')=>(await db.prepare(`SELECT count(*) AS n FROM ${table} WHERE ${where}`).first<{n:number}>())!.n;
const allocation=()=>db.prepare("SELECT meal_allocation FROM events WHERE id='e'").first<{meal_allocation:number|null}>();

it('freezes only confirmed seats exactly at cutoff, once, including volunteers',async()=>{
  await signup('guest');await signup('chef','confirmed','chef');await signup('u','undecided');await signup('w','waiting_list');await signup('c','cancelled');
  await freezeMealAllocation(timed,'e',clock).run();expect((await allocation())!.meal_allocation).toBeNull();
  clock=cutoff;await freezeMealAllocation(timed,'e',clock).run();expect((await allocation())!.meal_allocation).toBe(2);
  await db.prepare("UPDATE registrations SET status='cancelled' WHERE id='guest'").run();
  await freezeMealAllocation(timed,'e',clock+1000).run();expect((await allocation())!.meal_allocation).toBe(2);
});

it('snapshots before a late cancellation even if the scheduler has not run',async()=>{
  const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';await signup(id);await signup('waiting','waiting_list');
  const token=await managementToken(secret,id);
  await db.prepare("INSERT INTO registration_tokens VALUES ('t',?,?,?,NULL,0)").bind(id,await hashToken(token),starts+10800000).run();
  clock=cutoff+1000;
  await changeRegistration(timed,token,'cancel',0,undefined,clock);
  expect((await allocation())!.meal_allocation).toBe(1);
  expect((await promoteWaitingList(timed,'e',clock)).promoted).toBe(1);
  expect(await count('registrations',"status='confirmed'")).toBe(1);
});

it('rejects a cancellation that crosses cutoff between snapshot and mutation, then safely retries',async()=>{
  const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';await signup(id);
  const token=await managementToken(secret,id);
  await db.prepare("INSERT INTO registration_tokens VALUES ('t',?,?,?,NULL,0)").bind(id,await hashToken(token),starts+10800000).run();
  clock=cutoff-1;
  const crossing={prepare:(sql:string)=>db.prepare(sql.replaceAll("CAST(strftime('%s','now') AS INTEGER) * 1000",String(sql.startsWith('UPDATE registrations')?cutoff:clock))),batch:(s:D1PreparedStatement[])=>db.batch(s)} as D1Database;
  await expect(changeRegistration(crossing,token,'cancel',0,undefined,clock)).rejects.toMatchObject({code:'conflict'});
  expect(await count('registrations',"status='confirmed'")).toBe(1);
  clock=cutoff;
  await changeRegistration(timed,token,'cancel',0,undefined,clock);
  expect((await allocation())!.meal_allocation).toBe(1);
});

it('promotes FIFO with deterministic ties, skips full volunteer roles, and stops at the meal ceiling',async()=>{
  for(let i=0;i<3;i++)await signup(`chef${i}`,'confirmed','chef');
  await signup('blocked','waiting_list','chef',0);await signup('b','waiting_list','guest',2);await signup('a','waiting_list','helper_chef',2);await signup('later','waiting_list','guest',3);
  await db.prepare("UPDATE events SET meal_allocation=5 WHERE id='e'").run();clock=cutoff+1000;
  expect((await promoteWaitingList(timed,'e',clock)).promoted).toBe(2);
  expect(await count('registrations',"id IN ('a','b') AND status='confirmed'")).toBe(2);
  expect(await count('registrations',"id IN ('blocked','later') AND status='waiting_list'")).toBe(2);
  expect(await count('email_outbox',"template='waiting_list_promoted'")).toBe(2);
  expect((await db.prepare("SELECT registration_id FROM email_outbox WHERE template='waiting_list_promoted' ORDER BY rowid").all()).results).toEqual([{registration_id:'a'},{registration_id:'b'}]);
  expect(await count('email_outbox',"template='volunteer_signup'")).toBe(1);
});

it('does not allocate a meal to undecided people and never exceeds a zero allocation',async()=>{
  await signup('u','undecided');await signup('w','waiting_list');clock=cutoff;
  expect((await promoteWaitingList(timed,'e',clock)).promoted).toBe(0);
  expect((await allocation())!.meal_allocation).toBe(0);
});

it('can fill pre-cutoff capacity but makes no automatic promotions from Monday midnight',async()=>{
  await db.prepare("UPDATE events SET capacity=1 WHERE id='e'").run();
  await signup('a','waiting_list');await signup('b','waiting_list');
  expect((await promoteWaitingList(timed,'e',clock)).promoted).toBe(1);
  clock=cutoff;await freezeMealAllocation(timed,'e',clock).run();
  await db.prepare("UPDATE registrations SET status='cancelled' WHERE id='a'").run();
  clock=mondayStartsAt(starts);
  expect((await promoteWaitingList(timed,'e',clock)).promoted).toBe(0);
  expect(await count('registrations',"id='b' AND status='waiting_list'")).toBe(1);
});

it('allows Sunday just before midnight and blocks a delayed write crossing into Monday',async()=>{
  await signup('w','waiting_list');await db.prepare("UPDATE events SET meal_allocation=1 WHERE id='e'").run();
  const monday=mondayStartsAt(starts);clock=monday;
  expect((await promoteWaitingList(timed,'e',monday-1)).promoted).toBe(0);
  clock=monday-1;expect((await promoteWaitingList(timed,'e',clock)).promoted).toBe(1);
});

it('deduplicates concurrent promotion workers and rolls back promotion when outbox persistence fails',async()=>{
  await signup('w','waiting_list');
  await db.prepare("CREATE TRIGGER fail_promotion BEFORE INSERT ON email_outbox BEGIN SELECT RAISE(ABORT,'injected'); END").run();
  await expect(promoteWaitingList(timed,'e',clock)).rejects.toThrow();
  expect(await count('registrations',"status='waiting_list'")).toBe(1);
  await db.prepare('DROP TRIGGER fail_promotion').run();
  const results=await Promise.all([promoteWaitingList(timed,'e',clock),promoteWaitingList(timed,'e',clock)]);
  expect(results.reduce((sum,r)=>sum+r.promoted,0)).toBe(1);
  expect(await count('email_outbox')).toBe(1);
  expect((await promoteWaitingList(timed,'e',clock)).promoted).toBe(0);
});

it('never promotes cancelled gatherings and resolves Monday midnight through DST',async()=>{
  await signup('w','waiting_list');await db.prepare("UPDATE events SET status='cancelled' WHERE id='e'").run();
  expect((await promoteWaitingList(timed,'e',clock)).promoted).toBe(0);
  expect(mondayStartsAt(Date.parse('2027-03-29T17:00:00Z'))).toBe(Date.parse('2027-03-28T22:00:00Z'));
  expect(mondayStartsAt(Date.parse('2027-10-25T17:00:00Z'))).toBe(Date.parse('2027-10-24T22:00:00Z'));
});
