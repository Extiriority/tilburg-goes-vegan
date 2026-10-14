import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { PageServerLoad, Actions } from './$types';
import { getManagedRegistration, changeRegistration, RegistrationError } from '$lib/server/registrations/service';
import { detailsInput } from '$lib/server/registrations/validation';
import { coordinationInvite, registrationEnabled } from '$lib/server/registrations/config';
import { confirmedSite } from '$lib/server/site';

export const load:PageServerLoad=async({platform,params,url})=>{
  let registration=null;
  try { if(platform?.env.DB) registration=await getManagedRegistration(platform.env.DB,params.token); } catch { /* Do not log bearer URLs or participant data. */ }
  return {registration,managementUrl:url.origin+url.pathname,site:confirmedSite,
    invite:coordinationInvite(registration,platform?.env.WHATSAPP_INVITE_URL),
    editable:registrationEnabled(platform?.env),late:registration?Date.now()>=registration.registration_cutoff:false};
};

function action(kind:'cancel'|'confirm'|'details'):Actions[string] {
  return async({request,platform,params})=>{
    if(!registrationEnabled(platform?.env)) return fail(503,{managementError:'unavailable'});
    const form=await request.formData();
    const version=z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().nonnegative()).safeParse(form.get('version'));
    if(!version.success) return fail(400,{managementError:'conflict'});
    if(kind==='cancel' && form.get('confirmCancellation')!=='on') return fail(400,{managementError:'cancellationRequired'});
    const details=kind==='details'?detailsInput.safeParse({version:version.data,dietaryNotes:form.get('dietaryNotes')??'',dietaryConsent:form.get('dietaryConsent')==='on',comments:form.get('comments')??''}):null;
    if(details && !details.success) return fail(400,{managementError:'invalid',consentError:details.error.issues.some(issue=>issue.path[0]==='dietaryConsent')});
    try {
      await changeRegistration(platform!.env.DB,params.token!,kind,version.data,details?.success?details.data:undefined);
      return {saved:true};
    } catch(error) {
      return fail(error instanceof RegistrationError?400:500,{managementError:error instanceof RegistrationError?error.code:'server'});
    }
  };
}
export const actions:Actions={cancel:action('cancel'),confirm:action('confirm'),details:action('details')};
