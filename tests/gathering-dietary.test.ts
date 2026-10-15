import { readFileSync, readdirSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { saveGatheringDietary, getGatheringDietary } from '../src/lib/server/admin/gathering-dietary';
import { readDietaryForm } from '../src/lib/dietary';
import { cleanupPrivacy } from '../src/lib/server/privacy/cleanup';
let mf: Miniflare, db: D1Database, end: number;
const DAY=86400000;
beforeEach(async()=>{
  mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2025-10-11',d1Databases:['DB']});
  db=await mf.getD1Database('DB') as unknown as D1Database;
  for(const file of readdirSync('drizzle').filter(file=>file.endsWith('.sql')).sort())
    await db.batch(readFileSync(`drizzle/${file}`,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  end=Date.now()+7*DAY;
  await db.prepare("INSERT INTO admin_users VALUES ('admin','demo@example.invalid','test',0)").run();
  await db.prepare("INSERT INTO events (id,occurrence_key,slug,starts_at,ends_at,venue_id,capacity,registration_cutoff,created_at) VALUES ('e','test','test',?,?,'tgv-v39',30,?,0)").bind(end-10800000,end,end-DAY).run();
});
afterEach(async()=>{await mf?.dispose();});
function form(ids:string[],version=0,consent=true){const f=new FormData();f.set('eventId','e');f.set('version',String(version));f.set('dietaryFormat','v1');if(consent)f.set('dietaryConsent','on');ids.forEach(id=>f.append('allergens',id));return f;}
it('merges external reports without changing website dietary data and rejects stale saves',async()=>{
  const notes=readDietaryForm(form(['soy']));
  await db.prepare("INSERT INTO registrations (id,event_id,email_normalized,full_name,role,status,language,dietary_notes,dietary_consent_at,created_at,updated_at) VALUES ('r','e','demo@example.invalid','Demo','guest','confirmed','en',?,1,0,0)").bind(notes).run();
  await saveGatheringDietary(db,'admin',form(['peanuts']));
  expect((await getGatheringDietary(db,'e')).allergens).toEqual(['peanuts','soy']);
  await expect(saveGatheringDietary(db,'admin',form(['milk']))).rejects.toThrow();
  await saveGatheringDietary(db,'admin',form([],1));
  expect((await getGatheringDietary(db,'e')).allergens).toEqual(['soy']);
  expect(await db.prepare("SELECT dietary_notes FROM registrations WHERE id='r'").first('dietary_notes')).toBe(notes);
});
it('requires consent for external reports and does not audit their contents',async()=>{
  await expect(saveGatheringDietary(db,'admin',form(['peanuts'],0,false))).rejects.toThrow();
  expect((await getGatheringDietary(db,'e')).allergens).toEqual([]);
  await saveGatheringDietary(db,'admin',form(['sesame']));
  const audits=await db.prepare('SELECT * FROM audit_events').all();
  expect(JSON.stringify(audits.results)).not.toContain('sesame');
});
it('hides and deletes reports exactly at +24h including cancelled gatherings and rejects late writes',async()=>{
  await saveGatheringDietary(db,'admin',form(['mustard']));
  await db.prepare("UPDATE events SET status='cancelled' WHERE id='e'").run();
  expect((await getGatheringDietary(db,'e',end+DAY-1)).allergens).toEqual(['mustard']);
  expect((await getGatheringDietary(db,'e',end+DAY)).allergens).toEqual([]);
  await expect(saveGatheringDietary(db,'admin',form(['milk'],1),end+DAY)).rejects.toThrow();
  await cleanupPrivacy(db,end+DAY-1);
  expect(await db.prepare('SELECT count(*) AS n FROM gathering_dietary').first('n')).toBe(1);
  await cleanupPrivacy(db,end+DAY);
  expect(await db.prepare('SELECT count(*) AS n FROM gathering_dietary').first('n')).toBe(0);
  await cleanupPrivacy(db,end+DAY);
});
