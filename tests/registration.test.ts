import { readFileSync, readdirSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { register, changeRegistration, getManagedRegistration } from '../src/lib/server/registrations/service';
import { createSubmissionToken, hashToken, managementToken, verifySubmissionToken } from '../src/lib/server/registrations/tokens';
import { registrationInput, detailsInput } from '../src/lib/server/registrations/validation';

const secret='test-only-key-not-for-production-use-123456789';
let mf: Miniflare;
let db: D1Database;
let now: number;
beforeEach(async () => {
  now=Date.now();
  mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2025-10-11',d1Databases:['DB']});
  db=await mf.getD1Database('DB') as unknown as D1Database;
  for (const file of readdirSync('drizzle').filter(file=>file.endsWith('.sql')).sort()) {
    for (const statement of readFileSync(`drizzle/${file}`,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean)) await db.prepare(statement).run();
  }
  await db.prepare("INSERT INTO events (id,occurrence_key,slug,starts_at,ends_at,venue_id,capacity,registration_cutoff,created_at) VALUES ('e','test-occurrence','test-event',?,?,'tgv-v39',30,?,?)").bind(now+14*86400000,now+14*86400000+10800000,now+12*86400000,now).run();
});
afterEach(async()=>{await mf?.dispose();});
const input=async(email='test@example.invalid',role:'guest'|'chef'|'helper_chef'='guest',undecided=false)=>registrationInput.parse({eventId:'e',fullName:'Test person',email,role,language:'nl',undecided,dietaryNotes:'',dietaryConsent:false,comments:'',submissionToken:await createSubmissionToken(secret)});
const n=async(table:string,where='1=1')=>(await db.prepare(`SELECT count(*) AS n FROM ${table} WHERE ${where}`).first<{n:number}>())!.n;

it('rejects direct submissions for gray gatherings and opens exactly at local midnight',async()=>{
  const starts=Date.parse('2026-11-23T18:00:00Z');
  const opens=Date.parse('2026-10-26T23:00:00Z');
  await db.prepare("UPDATE events SET starts_at=?,ends_at=?,registration_cutoff=? WHERE id='e'").bind(starts,starts+10800000,starts-3*86400000).run();
  // An isolated database clock lets us test a future whole-second boundary;
  // production code still always checks the real D1 clock as well as request time.
  const at=(clock:number)=>({prepare:(sql:string)=>db.prepare(sql.replaceAll("CAST(strftime('%s','now') AS INTEGER) * 1000",String(clock))),batch:(statements:D1PreparedStatement[])=>db.batch(statements)}) as D1Database;
  const value=await input();
  await expect(register(at(opens-1),secret,value,opens-1)).rejects.toMatchObject({code:'not_open'});
  expect(await n('registrations')).toBe(0);
  expect(await n('email_outbox')).toBe(0);
  // A forged request clock cannot open registration before database time.
  await expect(register(at(opens-1000),secret,value,opens)).rejects.toMatchObject({code:'closed'});
  expect(await n('registration_tokens')).toBe(0);
  const result=await register(at(opens),secret,value,opens);
  expect(result.registration.status).toBe('confirmed');
  expect(await n('registrations')).toBe(1);
});

it('atomically confirms at most 30 people and three of each volunteer role',async()=>{
  const inputs=await Promise.all(Array.from({length:40},(_,i)=>input(`person${i}@example.invalid`,i<5?'chef':i<10?'helper_chef':'guest')));
  const results=await Promise.all(inputs.map(value=>register(db,secret,value,now)));
  expect(results.filter(r=>r.registration.status==='confirmed')).toHaveLength(30);
  expect(await n('registrations',"role='chef' AND status='confirmed'")).toBe(3);
  expect(await n('registrations',"role='helper_chef' AND status='confirmed'")).toBe(3);
  expect(await n('registration_tokens')).toBe(40);
  expect(await n('email_outbox',"recipient LIKE 'person%'")).toBe(40);
});

it('retries the same signed submission without duplicating rows or emails',async()=>{
  const value=await input();
  const results=await Promise.all([register(db,secret,value,now),register(db,secret,value,now)]);
  expect(results[0].token).toBe(results[1].token);
  expect(await n('registrations')).toBe(1);
  expect(await n('email_outbox')).toBe(1);
  await expect(register(db,secret,{...value,email:'another@example.invalid'},now)).rejects.toMatchObject({code:'conflict'});
});

it('normalizes email and prevents a second active registration',async()=>{
  await register(db,secret,await input('  Test@Example.INVALID  '),now);
  await expect(register(db,secret,await input('test@example.invalid'),now)).rejects.toMatchObject({code:'duplicate'});
  expect(await n('registrations')).toBe(1);
  expect(await n('registration_tokens')).toBe(1);
});

it('does not confirm an existing undecided place before its opening date',async()=>{
  const original=await register(db,secret,await input('legacy@example.invalid','guest',true),now);
  const starts=Date.parse('2026-11-23T18:00:00Z');
  await db.prepare("UPDATE events SET starts_at=?,ends_at=?,registration_cutoff=? WHERE id='e'").bind(starts,starts+10800000,starts-3*86400000).run();
  await expect(changeRegistration(db,original.token,'confirm',0,undefined,now)).rejects.toMatchObject({code:'not_open'});
  expect(await n('registration_mutations')).toBe(0);
});

it('enforces cutoff at the write and rejects cancelled gatherings',async()=>{
  const cutoff=now+86400000;
  await db.prepare("UPDATE events SET registration_cutoff=? WHERE id='e'").bind(cutoff).run();
  await expect(register(db,secret,await input(),cutoff)).rejects.toMatchObject({code:'closed'});
  expect(await n('email_outbox')).toBe(0);
  await db.prepare("UPDATE events SET status='cancelled' WHERE id='e'").run();
  await expect(register(db,secret,await input(),now)).rejects.toMatchObject({code:'closed'});
});

it('does not reserve seats for undecided people and rechecks capacity on confirmation',async()=>{
  await db.prepare("UPDATE events SET capacity=1 WHERE id='e'").run();
  const unsure=await register(db,secret,await input('unsure@example.invalid','guest',true),now);
  expect(unsure.registration.status).toBe('undecided');
  await register(db,secret,await input(),now);
  await expect(changeRegistration(db,unsure.token,'confirm',0,undefined,now)).rejects.toMatchObject({code:'full'});
  expect(await n('registration_mutations')).toBe(0);
  expect((await getManagedRegistration(db,unsure.token,now))!.status).toBe('undecided');
});

it('confirms undecided before cutoff, but never at or after it',async()=>{
  const unsure=await register(db,secret,await input('unsure@example.invalid','guest',true),now);
  const cutoff=now+86400000;
  await db.prepare("UPDATE events SET registration_cutoff=? WHERE id='e'").bind(cutoff).run();
  await expect(changeRegistration(db,unsure.token,'confirm',0,undefined,cutoff)).rejects.toMatchObject({code:'closed'});
  expect((await changeRegistration(db,unsure.token,'confirm',0,undefined,cutoff-1)).status).toBe('confirmed');
});

it('cancels without deleting history and permits a new signup with the same email',async()=>{
  const original=await register(db,secret,await input(),now);
  expect((await changeRegistration(db,original.token,'cancel',0,undefined,now)).status).toBe('cancelled');
  const replacement=await register(db,secret,await input(),now);
  expect(replacement.registration.status).toBe('confirmed');
  expect(await n('registrations')).toBe(2);
});

it('allows only one racing edit and records no losing email intent',async()=>{
  const original=await register(db,secret,await input(),now);
  const results=await Promise.allSettled(['first','second'].map(comments=>changeRegistration(db,original.token,'details',0,detailsInput.parse({version:0,dietaryNotes:'',dietaryConsent:false,comments}),now)));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect(await n('registration_mutations')).toBe(1);
  expect(await n('email_outbox',"template='registration_details'")).toBe(1);
});

it('requires consent and queues late dietary alerts without copying dietary text',async()=>{
  expect(registrationInput.safeParse({...await input(),dietaryNotes:'Test dietary note',dietaryConsent:false}).success).toBe(false);
  const original=await register(db,secret,await input(),now);
  await db.prepare("UPDATE events SET registration_cutoff=? WHERE id='e'").bind(now).run();
  await changeRegistration(db,original.token,'details',0,detailsInput.parse({version:0,dietaryNotes:'Test dietary note',dietaryConsent:true,comments:''}),now);
  const outbox=await db.prepare('SELECT * FROM email_outbox').all();
  expect(JSON.stringify(outbox)).not.toContain('Test dietary note');
  expect(await n('email_outbox',"template='late_dietary_change'")).toBe(1);
});

it('stores only token hashes and expires access exactly at dinner end',async()=>{
  const original=await register(db,secret,await input(),now);
  const stored=await db.prepare('SELECT token_hash,expires_at FROM registration_tokens').first<{token_hash:string;expires_at:number}>();
  expect(stored!.token_hash).toBe(await hashToken(original.token));
  expect(stored!.token_hash).not.toBe(original.token);
  expect(await getManagedRegistration(db,original.token,stored!.expires_at)).toBeNull();
  await db.prepare('UPDATE registration_tokens SET revoked_at=?').bind(now).run();
  expect(await getManagedRegistration(db,original.token,now)).toBeNull();
});

it('separates submission and management credentials and rejects tampering',async()=>{
  const token=await createSubmissionToken(secret);
  const id=await verifySubmissionToken(secret,token);
  expect(id).toBeTruthy();
  expect(await verifySubmissionToken(secret,await managementToken(secret,id!))).toBeNull();
  expect(await verifySubmissionToken(secret,token.slice(0,-1)+(token.endsWith('0')?'1':'0'))).toBeNull();
});

it('rolls back signup and token creation when email intent persistence fails',async()=>{
  await db.prepare("CREATE TRIGGER fail_outbox BEFORE INSERT ON email_outbox BEGIN SELECT RAISE(ABORT,'injected_failure'); END").run();
  await expect(register(db,secret,await input(),now)).rejects.toThrow();
  expect(await n('registrations')).toBe(0);
  expect(await n('registration_tokens')).toBe(0);
});

it('rechecks token revocation inside the mutation transaction',async()=>{
  const original=await register(db,secret,await input(),now);
  const wrapped={prepare:db.prepare.bind(db),batch:async(statements:D1PreparedStatement[])=>{
    await db.prepare('UPDATE registration_tokens SET revoked_at=?').bind(now).run();
    return db.batch(statements);
  }} as unknown as D1Database;
  await expect(changeRegistration(wrapped,original.token,'cancel',0,undefined,now)).rejects.toMatchObject({code:'conflict'});
  expect(await n('registrations',"status='confirmed'")).toBe(1);
  expect(await n('registration_mutations')).toBe(0);
  expect(await n('email_outbox')).toBe(1);
});
