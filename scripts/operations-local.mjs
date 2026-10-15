import { getPlatformProxy } from 'wrangler';
import { cleanupPrivacy } from '../src/lib/server/privacy/cleanup.ts';
import { processWaitingLists } from '../src/lib/server/events/waiting-list.ts';
import { expireUndecided } from '../src/lib/server/events/undecided.ts';

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
    const cleanup = await cleanupPrivacy(proxy.env.DB); const undecided = await expireUndecided(proxy.env.DB); const waitingList = await processWaitingLists(proxy.env.DB); const result = {cleanup,undecided,waitingList};
    console.log('Local operations:', result);
  } catch {
    console.error('Local operations failed. Check local migrations and database access.');
    if (!watch) process.exitCode = 1;
  } finally {
    running = false;
    if (!watch || stopping) await proxy.dispose();
    else timer = setTimeout(run, 60_000);
  }
}
await run();
