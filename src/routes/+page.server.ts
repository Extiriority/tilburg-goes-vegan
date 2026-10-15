import { upcomingOccurrences, availability, registrationOpensAt } from '$lib/server/events/schedule';
import type { PageServerLoad } from './$types';
import type { Actions } from './$types';
import { confirmedSite } from '$lib/server/site';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { registrationEnabled } from '$lib/server/registrations/config';
import { createSubmissionToken } from '$lib/server/registrations/tokens';
import { readRegistrationForm } from '$lib/server/registrations/validation';
import { register, RegistrationError } from '$lib/server/registrations/service';
import { registrationWindow } from '$lib/server/events/window';

export const load: PageServerLoad = async ({ platform }) => {
  const now = Date.now();
  const occurrences = upcomingOccurrences(now);
  const ready=registrationEnabled(platform?.env);
  const registration={registrationReady:ready,submissionToken:ready?await createSubmissionToken(platform!.env.MANAGEMENT_TOKEN_SECRET!):'',hasRecipes:false};
  if (!platform?.env.DB) return { ...registration,site: confirmedSite, gatherings: occurrences.map((event) => ({ ...event, id:'', canRegister:false, registrationOpensAt:registrationOpensAt(event.startsAt), venue: confirmedSite.venue, address: confirmedSite.address, mapsUrl: confirmedSite.mapsUrl, availability: 'setup_pending' })) };
  const rows = await platform.env.DB.prepare(`
    SELECT e.id,e.occurrence_key,e.starts_at,e.ends_at,e.registration_cutoff,e.capacity,e.status,v.name AS venue,v.address,
      (SELECT COALESCE(sum(seats),0) FROM confirmed_participants r WHERE r.event_id=e.id) AS confirmed
    FROM events e JOIN venues v ON v.id=e.venue_id WHERE e.ends_at>? ORDER BY e.starts_at,e.id LIMIT 4
  `).bind(now).all<{
    id:string; occurrence_key: string; starts_at: number; ends_at: number; registration_cutoff: number;
    capacity: number; status: string; confirmed: number; venue: string; address: string;
  }>();
  const hasRecipes=!!await platform.env.DB.prepare('SELECT id FROM recipes LIMIT 1').first();
  const gatherings=await Promise.all(rows.results.map(async(row)=>{
    const window=await registrationWindow(platform.env.DB,row.id);
    const opensAt=window?.opensAt??registrationOpensAt(row.starts_at);
    return {
      occurrenceKey: row.occurrence_key, startsAt: row.starts_at, endsAt: row.ends_at,
      registrationOpensAt:opensAt, id:row.id, canRegister:now>=opensAt && ready && row.status==='scheduled' && now<row.registration_cutoff,
      registrationCutoff: row.registration_cutoff,
      venue: row.venue, address: row.address, mapsUrl: row.address === confirmedSite.address ? confirmedSite.mapsUrl : `https://www.openstreetmap.org/search?query=${encodeURIComponent(row.address)}`,
      availability: availability({ registrationOpensAt:opensAt, status: row.status, registrationCutoff: row.registration_cutoff, capacity: row.capacity }, row.confirmed, now)
    };
  }));
  return { ...registration,hasRecipes,site: confirmedSite,gatherings:gatherings.length?gatherings:occurrences.map(occurrence=>({...occurrence,id:'',canRegister:false,registrationOpensAt:registrationOpensAt(occurrence.startsAt),venue:confirmedSite.venue,address:confirmedSite.address,mapsUrl:confirmedSite.mapsUrl,availability:'setup_pending'})) };
};

export const actions: Actions = {
  register: async ({request,platform}) => {
    if (!registrationEnabled(platform?.env)) return fail(503,{registrationError:'unavailable',registrationFields:[] as string[]});
    const parsed=readRegistrationForm(await request.formData());
    if (!parsed.success) return fail(400,{registrationError:'invalid',registrationFields:[...new Set(parsed.error.issues.map(issue=>String(issue.path[0])))]});
    let token:string;
    try {
      ({token}=await register(platform!.env.DB,platform!.env.MANAGEMENT_TOKEN_SECRET!,parsed.data));
    } catch (error) {
      return fail(error instanceof RegistrationError?400:500,{registrationError:error instanceof RegistrationError?error.code:'server',registrationFields:[] as string[]});
    }
    redirect(303,`/registration/manage/${token}`);
  },
  language: async ({ request, cookies, url }) => {
    const language = z.enum(['en', 'nl']).safeParse((await request.formData()).get('language'));
    if (!language.success) return fail(400);
    cookies.set('language', language.data, { path: '/', httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', maxAge: 365 * 24 * 60 * 60 });
    if (request.headers.get('x-sveltekit-action') === 'true') return { language: language.data };
    redirect(303, '/');
  }
};
