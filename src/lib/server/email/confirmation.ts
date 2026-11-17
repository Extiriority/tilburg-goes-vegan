import { TIMEZONE } from '../events/schedule.ts';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export function renderLocalConfirmation(input: {
  locale: 'en' | 'nl'; fullName: string; startsAt: number; venue: string; address: string; token: string; stagingOrigin?: string;
}) {
  const nl = input.locale === 'nl';
  const name = input.fullName.trim().split(/\s+/)[0];
  const when = new Intl.DateTimeFormat(nl ? 'nl-NL' : 'en-GB', {
    timeZone: TIMEZONE, dateStyle: 'full', timeStyle: 'short', hourCycle: 'h23',
  }).format(input.startsAt);
  const where = input.venue + ' · ' + input.address;
  const url = (input.stagingOrigin ?? 'http://localhost:5173') + '/registration/manage/' + encodeURIComponent(input.token);
  const subject = nl ? 'Je staat op de lijst! 🌱 Tilburg Goes Vegan (test)' : 'You’re on the list! 🌱 Tilburg Goes Vegan (test)';
  const heading = nl ? 'Je aanmelding is bevestigd!' : 'Your registration is confirmed!';
  const greeting = (nl ? 'Hoi ' : 'Hi ') + name + ',';
  const button = nl ? 'Mijn aanmelding beheren' : 'Manage my registration';
  const hint = nl
    ? 'Via je privélink kun je je gegevens aanpassen of annuleren voordat het diner begint. Deel deze link niet.'
    : 'Use your private link to update your details or cancel before dinner starts. Please keep it to yourself.';
  const local = input.stagingOrigin
    ? (nl ? 'Sandboxtest: meld je aan bij Cloudflare Access om de testsite te openen.' : 'Sandbox test: sign in with Cloudflare Access to open the staging site.')
    : (nl ? 'Sandboxtest: de link werkt alleen op de computer waarop de lokale site draait.' : 'Sandbox test: the link only works on the computer running the local site.');
  const labels = nl ? ['Wanneer', 'Waar'] : ['When', 'Where'];
  const signOff = nl ? 'Tot aan tafel!' : 'See you at the table!';
  const body = [greeting, heading, labels[0]+': '+when+'\n'+labels[1]+': '+where, button+': '+url, hint, signOff+'\nTilburg Goes Vegan', local].join('\n\n');
  const html = `<!doctype html><html lang="${input.locale}"><body style="margin:0;background:#fdfbf4;color:#23261c;font-family:Arial,sans-serif;padding:24px">
  <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #ddd8c8;border-radius:16px;padding:24px;line-height:1.55">
    <p style="color:#33563a;font-weight:bold">TILBURG GOES VEGAN 🌱</p>
    <h1 style="color:#33563a;font-size:26px">${heading}</h1><p>${escapeHtml(greeting)}</p>
    <p><strong>${labels[0]}:</strong> ${escapeHtml(when)}<br><strong>${labels[1]}:</strong> ${escapeHtml(where)}</p>
    <p><a href="${escapeHtml(url)}" style="display:inline-block;background:#33563a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${button}</a></p>
    <p>${hint}</p><p>${signOff}<br>Tilburg Goes Vegan</p><p style="font-size:13px;color:#5e6353">${local}</p>
  </div></body></html>`;
  return { subject, body, html };
}
