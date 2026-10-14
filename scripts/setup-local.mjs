import { existsSync, readFileSync, appendFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { upcomingOccurrences } from '../src/lib/server/events/schedule.ts';

// Local-only bootstrap: never invokes remote migrations, deployments or email.
const varsPath=resolve('.dev.vars');
const vars=existsSync(varsPath)?readFileSync(varsPath,'utf8'):'';
let additions='';
if(!/^MANAGEMENT_TOKEN_SECRET=/m.test(vars)) additions+=`MANAGEMENT_TOKEN_SECRET=${randomBytes(32).toString('hex')}\n`;
if(!/^REGISTRATION_ENABLED=/m.test(vars)) additions+='REGISTRATION_ENABLED=true\n';
if(additions) appendFileSync(varsPath,`${vars && !vars.endsWith('\n')?'\n':''}${additions}`,{mode:0o600});
const wrangler=resolve('node_modules/wrangler/bin/wrangler.js');
function run(args) {
  const result=spawnSync(process.execPath,[wrangler,...args],{stdio:'inherit'});
  if(result.status!==0) throw new Error('Local database setup failed');
}
run(['d1','migrations','apply','DB','--local']);
const now=Date.now();
const sql=upcomingOccurrences(now).map(event=>`INSERT INTO events (id,occurrence_key,slug,starts_at,ends_at,timezone,venue_id,capacity,registration_cutoff,created_at)
  SELECT '${event.occurrenceKey}','${event.occurrenceKey}','${event.occurrenceKey}',${event.startsAt},${event.endsAt},'Europe/Amsterdam',default_venue_id,COALESCE(default_capacity,30),${event.registrationCutoff},${now}
  FROM settings WHERE id=1 AND default_venue_id IS NOT NULL ON CONFLICT(occurrence_key) DO NOTHING;`).join('\n');
const taskDirectory=mkdtempSync(join(tmpdir(),'tgv-local-'));
const sqlPath=join(taskDirectory,'events.sql');
try {
  writeFileSync(sqlPath,sql);
  run(['d1','execute','DB','--local','--file',sqlPath]);
} finally {
  if(existsSync(sqlPath)) unlinkSync(sqlPath);
  rmdirSync(taskDirectory);
}
process.stdout.write('Local registration setup complete. Restart npm run dev to load local secrets. No email was sent.\n');
