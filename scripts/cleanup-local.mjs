import { getPlatformProxy } from 'wrangler';
import { cleanupPrivacy } from '../src/lib/server/privacy/cleanup.ts';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--watch')) throw new Error('Only --watch is supported; this command is local-only.');
const watch = args.includes('--watch');
const proxy = await getPlatformProxy({ configPath: 'wrangler.jsonc', persist: true, remoteBindings: false });
let timer;
let stopping = false;
let running = false;
async function stop() {
  stopping = true;
  clearTimeout(timer);
  if (!running) await proxy.dispose();
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
async function run() {
  running = true;
  try {
    const result = await cleanupPrivacy(proxy.env.DB);
    console.log('Local privacy cleanup:', result);
  } catch {
    console.error('Local privacy cleanup failed. Check local migrations and database access.');
    if (!watch) process.exitCode = 1;
  } finally {
    running = false;
    if (!watch || stopping) await proxy.dispose();
    else timer = setTimeout(run, 60_000);
  }
}
await run();
