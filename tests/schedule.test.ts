import { expect, it } from 'vitest';
import { upcomingOccurrences, availability, registrationOpensAt } from '../src/lib/server/events/schedule';

it('opens later gatherings at Amsterdam midnight after the dinner two occurrences earlier', () => {
  const events=upcomingOccurrences(Date.parse('2026-10-14T12:00:00Z'));
  expect(events.map(e=>registrationOpensAt(e.startsAt))).toEqual([0,0,Date.parse('2026-10-26T23:00:00Z'),Date.parse('2026-11-09T23:00:00Z')]);
  const opens=registrationOpensAt(events[2].startsAt);
  const event={status:'scheduled',capacity:30,registrationCutoff:events[2].registrationCutoff,registrationOpensAt:opens};
  expect(availability(event,0,opens-1)).toBe('not_open');
  expect(availability(event,0,opens)).toBe('available');
  expect(availability({...event,status:'cancelled'},0,opens)).toBe('cancelled');
  expect(new Date(registrationOpensAt(Date.parse('2027-04-12T17:00:00Z')))).toEqual(new Date('2027-03-15T23:00:00Z'));
  expect(new Date(registrationOpensAt(Date.parse('2027-11-08T18:00:00Z')))).toEqual(new Date('2027-10-11T22:00:00Z'));
});

it('shows four occurrences from the agreed anchor and advances after dinner ends', () => {
  expect(upcomingOccurrences(Date.parse('2026-10-14T12:00:00Z')).map((e) => e.occurrenceKey)).toEqual(['2026-10-26','2026-11-09','2026-11-23','2026-12-07']);
  expect(upcomingOccurrences(Date.parse('2026-10-26T21:00:00Z'))[0].occurrenceKey).toBe('2026-11-09');
});
it('keeps Amsterdam dinner and Saturday cutoff wall times across both DST changes', () => {
  const spring = upcomingOccurrences(Date.parse('2027-03-14T12:00:00Z'));
  expect(new Date(spring[0].startsAt).toISOString()).toBe('2027-03-15T18:00:00.000Z');
  expect(new Date(spring[1].startsAt).toISOString()).toBe('2027-03-29T17:00:00.000Z');
  expect(new Date(spring[1].registrationCutoff).toISOString()).toBe('2027-03-27T15:00:00.000Z');
  const autumn = upcomingOccurrences(Date.parse('2027-10-11T12:00:00Z'));
  expect(new Date(autumn[0].startsAt).toISOString()).toBe('2027-10-11T17:00:00.000Z');
  expect(new Date(autumn[1].startsAt).toISOString()).toBe('2027-10-25T17:00:00.000Z');
  const after = upcomingOccurrences(Date.parse('2027-10-25T21:00:00Z'));
  expect(new Date(after[0].startsAt).toISOString()).toBe('2027-11-08T18:00:00.000Z');
});
it('enforces cutoff, cancellation and the 80 percent boundary for capacity 30', () => {
  const event = {status:'scheduled',registrationCutoff:100,capacity:30};
  expect(availability(event,23,99)).toBe('available');
  expect(availability(event,24,99)).toBe('almost_full');
  expect(availability(event,30,99)).toBe('waiting_list');
  expect(availability(event,0,100)).toBe('closed');
  expect(availability({...event,status:'cancelled'},0,100)).toBe('cancelled');
});
