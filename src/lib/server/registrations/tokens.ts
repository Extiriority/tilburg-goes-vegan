const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');

export async function hashToken(token: string) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
}

async function mac(secret: string, purpose: string, id: string) {
  if (secret.length < 32) throw new Error('Management token secret must be at least 32 characters');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(`tgv:v1:${purpose}:${id}`)));
}

export async function managementToken(secret: string, id: string) {
  return `${id}.${await mac(secret, 'manage', id)}`;
}

export async function createSubmissionToken(secret: string) {
  const id = crypto.randomUUID();
  return `${id}.${await mac(secret, 'submit', id)}`;
}

export async function verifySubmissionToken(secret: string, token: string) {
  const [id, signature, extra] = token.split('.');
  if (extra || !/^[a-f0-9-]{36}$/.test(id ?? '') || !/^[a-f0-9]{64}$/.test(signature ?? '')) return null;
  const expected = await mac(secret, 'submit', id);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return difference === 0 ? id : null;
}
