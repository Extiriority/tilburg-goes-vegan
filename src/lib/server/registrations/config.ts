import type { ManagedRegistration } from './service';

export function registrationEnabled(env: App.Platform['env'] | undefined) {
  // Production remains closed until SMTP, retention, rate limits and the reviewed
  // privacy notice are ready. This increment is explicitly local-only.
  return import.meta.env.DEV && env?.REGISTRATION_ENABLED==='true' && (env.MANAGEMENT_TOKEN_SECRET?.length ?? 0)>=32;
}

export function coordinationInvite(registration: ManagedRegistration | null, invite: string | undefined) {
  if (!registration || registration.role==='guest' || !['confirmed','waiting_list'].includes(registration.status) || registration.event_status!=='scheduled' || !invite) return null;
  try {
    const url=new URL(invite);
    return url.protocol==='https:' && url.hostname==='chat.whatsapp.com' ? url.href : null;
  } catch { return null; }
}
