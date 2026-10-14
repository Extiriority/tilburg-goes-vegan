import { expect, it } from 'vitest';
import { coordinationInvite, registrationEnabled } from '../src/lib/server/registrations/config';
import type { ManagedRegistration } from '../src/lib/server/registrations/service';

const fakeInvite=new URL('/TEST_ONLY_NOT_A_REAL_INVITE','https://chat.whatsapp.com').href;
const record=(role:ManagedRegistration['role'],status:ManagedRegistration['status'],event_status='scheduled')=>({role,status,event_status} as ManagedRegistration);
it('reveals coordination links only to confirmed or waiting-list volunteers with valid access',()=>{
  expect(coordinationInvite(null,fakeInvite)).toBeNull();
  expect(coordinationInvite(record('guest','confirmed'),fakeInvite)).toBeNull();
  expect(coordinationInvite(record('chef','undecided'),fakeInvite)).toBeNull();
  expect(coordinationInvite(record('chef','cancelled'),fakeInvite)).toBeNull();
  expect(coordinationInvite(record('helper_chef','waiting_list'),fakeInvite)).toBe(fakeInvite);
  expect(coordinationInvite(record('chef','confirmed'),fakeInvite)).toBe(fakeInvite);
  expect(coordinationInvite(record('chef','confirmed','cancelled'),fakeInvite)).toBeNull();
});
it('handles missing/unsafe invitation configuration without exposing an arbitrary URL',()=>{
  expect(coordinationInvite(record('chef','confirmed'),undefined)).toBeNull();
  expect(coordinationInvite(record('chef','confirmed'),'javascript:alert(1)')).toBeNull();
  expect(coordinationInvite(record('chef','confirmed'),'https://example.invalid')).toBeNull();
});
it('requires explicit local enablement and a sufficiently long signing key',()=>{
  expect(registrationEnabled(undefined)).toBe(false);
  expect(registrationEnabled({DB:{} as D1Database,REGISTRATION_ENABLED:'true',MANAGEMENT_TOKEN_SECRET:'short'})).toBe(false);
  expect(registrationEnabled({DB:{} as D1Database,REGISTRATION_ENABLED:'false',MANAGEMENT_TOKEN_SECRET:'x'.repeat(64)})).toBe(false);
});
