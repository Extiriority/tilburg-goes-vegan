import { expect, it, vi } from 'vitest';
import { actions } from '../src/routes/+page.server';
type LanguageEvent = Parameters<typeof actions.language>[0];

function event(language: string, enhanced: boolean, secure = true) {
  const cookie = vi.fn();
  const url = new URL(secure ? 'https://example.invalid/' : 'http://localhost:5175/');
  const request = new Request(url, {
    method: 'POST', body: new URLSearchParams({language}),
    headers: enhanced ? {'x-sveltekit-action':'true'} : {}
  });
  return { cookie, input: {request, url, cookies: {set:cookie}} as unknown as LanguageEvent };
}

it('saves an enhanced language preference without redirecting or reading events', async () => {
  const {cookie,input} = event('nl',true);
  expect(await actions.language(input)).toEqual({language:'nl'});
  expect(cookie).toHaveBeenCalledWith('language','nl',expect.objectContaining({httpOnly:true,secure:true,sameSite:'lax',path:'/'}));
});

it('keeps the native POST/redirect fallback and supports local HTTP', async () => {
  const {cookie,input} = event('en',false,false);
  await expect(actions.language(input)).rejects.toMatchObject({status:303,location:'/'});
  expect(cookie).toHaveBeenCalledWith('language','en',expect.objectContaining({secure:false}));
});

it('rejects unsupported languages without writing a cookie', async () => {
  const {cookie,input} = event('fr',true);
  expect(await actions.language(input)).toMatchObject({status:400});
  expect(cookie).not.toHaveBeenCalled();
});
