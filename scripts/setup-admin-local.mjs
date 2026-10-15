import { getPlatformProxy } from 'wrangler';
import { readFileSync, appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../src/lib/server/admin/password.ts';

if (process.argv.length > 2) throw new Error('No arguments supported. Local setup only.');
let vars = readFileSync('.dev.vars', 'utf8');
if (!/^LOCAL_ADMIN_PASSWORD=/m.test(vars)) {
  const addition = `${vars.endsWith('\n') ? '' : '\n'}LOCAL_ADMIN_PASSWORD=${randomBytes(24).toString('base64url')}\n`;
  appendFileSync('.dev.vars', addition, { mode: 0o600 });
  vars += addition;
}
const password = vars.match(/^LOCAL_ADMIN_PASSWORD=(.+)$/m)[1].trim();
const proxy = await getPlatformProxy({
  configPath: 'wrangler.jsonc',
  persist: true,
  remoteBindings: false,
});
try {
  const settings = await proxy.env.DB.prepare(
    'SELECT organizer_email FROM settings WHERE id=1',
  ).first();
  if (!settings?.organizer_email) throw new Error('Configure organizer email first.');
  await proxy.env.DB.prepare(
    'INSERT INTO admin_users (id,email,password_hash,created_at) VALUES (?,?,?,?) ON CONFLICT(email) DO NOTHING',
  )
    .bind(
      crypto.randomUUID(),
      settings.organizer_email.trim().toLowerCase(),
      await hashPassword(password),
      Date.now(),
    )
    .run();
  console.log(
    'Local organizer login ready. Use the configured organizer email and LOCAL_ADMIN_PASSWORD in ignored .dev.vars. Existing credentials are preserved.',
  );
} finally {
  await proxy.dispose();
}
