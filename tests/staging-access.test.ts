import { expect, it, vi } from 'vitest';
import { verifyStagingAccess } from '../src/lib/server/staging-access';

it('accepts only a signed assertion for the configured staging origin and audience', async () => {
  const settings = {
    STAGING_ORIGIN: 'https://tilburg-goes-vegan-staging.test-team.workers.dev',
    ACCESS_ISSUER: 'https://test-team.cloudflareaccess.com',
    ACCESS_AUDIENCE: 'staging-only',
  };
  const pair = await crypto.subtle.generateKey({
    name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256',
  }, true, ['sign', 'verify']);
  const keys = vi.fn(async () => Response.json({ keys: [
    { ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid: 'test-key' },
  ] }));
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const head = encode({ alg: 'RS256', kid: 'test-key' });
  const payload = encode({ iss: settings.ACCESS_ISSUER, aud: [settings.ACCESS_AUDIENCE], exp: 120, email: 'tester@example.invalid' });
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(head + '.' + payload));
  const token = [head, payload, Buffer.from(signature).toString('base64url')].join('.');
  const request = new Request(settings.STAGING_ORIGIN, { headers: { 'Cf-Access-Jwt-Assertion': token } });
  expect(await verifyStagingAccess(new Request(settings.STAGING_ORIGIN), settings, keys, 100000)).toBe(false);
  expect(await verifyStagingAccess(request, { ...settings, ACCESS_AUDIENCE: 'wrong' }, keys, 100000)).toBe(false);
  expect(await verifyStagingAccess(request, settings, keys, 120000)).toBe(false);
  expect(await verifyStagingAccess(new Request('https://elsewhere.example', { headers: request.headers }), settings, keys, 100000)).toBe(false);
  expect(await verifyStagingAccess(request, settings, keys, 100000)).toBe(true);
  const forged = new Request(settings.STAGING_ORIGIN, { headers: { 'Cf-Access-Jwt-Assertion': [head, payload, 'AAA'].join('.') } });
  expect(await verifyStagingAccess(forged, settings, keys, 100000)).toBe(false);
  expect(keys).toHaveBeenCalledWith(settings.ACCESS_ISSUER + '/cdn-cgi/access/certs', { redirect: 'error' });
});

it('uses only a current key snapshot for the configured issuer when key fetching fails', async () => {
  const issuer = 'https://snapshot-test.cloudflareaccess.com';
  const origin = 'https://tilburg-goes-vegan-staging.snapshot-test.workers.dev';
  const pair = await crypto.subtle.generateKey({
    name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256',
  }, true, ['sign', 'verify']);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const input = `${encode({ alg: 'RS256', kid: 'snapshot-key' })}.${encode({
    iss: issuer, aud: ['staging'], exp: 200, email: 'tester@example.invalid',
  })}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(input));
  const request = new Request(origin, { headers: {
    'Cf-Access-Jwt-Assertion': `${input}.${Buffer.from(signature).toString('base64url')}`,
  } });
  const snapshot = { issuer, expires: 110000, keys: [
    { ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid: 'snapshot-key' },
  ] };
  const settings = { STAGING_ORIGIN: origin, ACCESS_ISSUER: issuer, ACCESS_AUDIENCE: 'staging' };
  const unavailable = vi.fn(async () => new Response(null, { status: 503 }));
  expect(await verifyStagingAccess(request, {
    ...settings, ACCESS_KEY_SNAPSHOT: JSON.stringify({ ...snapshot, issuer: 'https://wrong.cloudflareaccess.com' }),
  }, unavailable, 100000)).toBe(false);
  const fallback = { ...settings, ACCESS_KEY_SNAPSHOT: JSON.stringify(snapshot) };
  expect(await verifyStagingAccess(request, fallback, unavailable, 100000)).toBe(true);
  expect(await verifyStagingAccess(request, fallback, unavailable, 110000)).toBe(false);
});
