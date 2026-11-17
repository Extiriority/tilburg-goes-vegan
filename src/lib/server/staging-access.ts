type AccessSettings = {
  STAGING_ORIGIN?: string;
  ACCESS_ISSUER?: string;
  ACCESS_AUDIENCE?: string;
  ACCESS_KEY_SNAPSHOT?: string;
};
type AccessKey = JsonWebKey & { kid?: string };
const cache = new Map<string, { expires: number; keys: AccessKey[] }>();
const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const json = (value: string) => JSON.parse(new TextDecoder().decode(decode(value)));
const fetchAccessKeys: typeof fetch = (input, init) => fetch(input, init);

async function loadAccessKeys(issuer: string, fetchKeys: typeof fetch): Promise<AccessKey[] | undefined> {
  try {
    const response = await fetchKeys(issuer + '/cdn-cgi/access/certs', { redirect: 'error' });
    if (!response.ok) return;
    const { keys } = await response.json() as { keys?: AccessKey[] };
    if (Array.isArray(keys) && keys.length) return keys;
  } catch {
    return;
  }
}

export async function verifyStagingAccess(request: Request, settings: AccessSettings, fetchKeys = fetchAccessKeys, now = Date.now()) {
  return await stagingAccessFailure(request, settings, fetchKeys, now) === null;
}

export async function stagingAccessFailure(request: Request, settings: AccessSettings, fetchKeys = fetchAccessKeys, now = Date.now()) {
  const { STAGING_ORIGIN: origin, ACCESS_ISSUER: issuer, ACCESS_AUDIENCE: audience } = settings;
  if (!origin || !issuer || !audience || new URL(request.url).origin !== origin ||
      !/^https:\/\/tilburg-goes-vegan-staging\.[a-z0-9-]+\.workers\.dev$/.test(origin) ||
      !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)) return 'origin';
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length > 8192 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return 'assertion';
  let failure = 'format';
  try {
    const [head, payload, signature] = token.split('.');
    const header = json(head), claims = json(payload);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return 'format';
    if (claims.iss !== issuer) return 'issuer';
    if (!Array.isArray(claims.aud) || !claims.aud.includes(audience)) return 'audience';
    if (!Number.isFinite(claims.exp) || claims.exp * 1000 <= now ||
        (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf * 1000 > now))) return 'time';
    if (typeof claims.email !== 'string' || !claims.email) return 'identity';
    failure = 'key-fetch';
    let entry = cache.get(issuer);
    if (!entry || entry.expires <= now) {
      const keys = await loadAccessKeys(issuer, fetchKeys);
      if (keys) {
        entry = { keys, expires: now + 300000 };
      } else {
        const snapshot = JSON.parse(settings.ACCESS_KEY_SNAPSHOT ?? 'null');
        if (snapshot?.issuer !== issuer || !Number.isFinite(snapshot.expires) || snapshot.expires <= now ||
            !Array.isArray(snapshot.keys) || !snapshot.keys.length) return failure;
        entry = { keys: snapshot.keys, expires: Math.min(snapshot.expires, now + 60000) };
      }
      cache.set(issuer, entry);
    }
    const jwk = entry.keys.find(key => key.kid === header.kid && key.kty === 'RSA');
    if (!jwk) return 'key-id';
    failure = 'key-import';
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    failure = 'signature';
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(signature), new TextEncoder().encode(head + '.' + payload));
    return valid ? null : failure;
  } catch {
    return failure;
  }
}
