import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).transform(value => value || null);
export const registrationInput = z.object({
  eventId: z.string().min(1).max(100),
  fullName: z.string().trim().min(1).max(160),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  role: z.enum(['guest', 'helper_chef', 'chef']),
  language: z.enum(['en', 'nl']),
  undecided: z.boolean(),
  dietaryNotes: optionalText(2000),
  dietaryConsent: z.boolean(),
  comments: optionalText(2000),
  submissionToken: z.string().min(50).max(150)
}).refine(value => !value.dietaryNotes || value.dietaryConsent, { path: ['dietaryConsent'], message: 'dietary_consent' });

export const detailsInput = z.object({
  version: z.coerce.number().int().nonnegative(),
  dietaryNotes: optionalText(2000),
  dietaryConsent: z.boolean(),
  comments: optionalText(2000)
}).refine(value => !value.dietaryNotes || value.dietaryConsent, { path: ['dietaryConsent'], message: 'dietary_consent' });

export type RegistrationInput = z.infer<typeof registrationInput>;
export type DetailsInput = z.infer<typeof detailsInput>;

export function readRegistrationForm(form: FormData) {
  return registrationInput.safeParse({
    eventId: form.get('eventId'), fullName: form.get('fullName'), email: form.get('email'), role: form.get('role'), language: form.get('language'),
    undecided: form.get('undecided') === 'on', dietaryNotes: form.get('dietaryNotes') ?? '', dietaryConsent: form.get('dietaryConsent') === 'on',
    comments: form.get('comments') ?? '', submissionToken: form.get('submissionToken')
  });
}
