export const DEFAULT_CAPACITY = 30;
export const UPCOMING_COUNT = 4;
export const TIMEZONE = 'Europe/Amsterdam';
const DAY = 86_400_000;
const FIRST_DATE = Date.UTC(2026, 9, 26);
const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

// Convert a local calendar date/hour into its UTC instant, resolving the zone
// for that date rather than adding fixed UTC durations across DST boundaries.
export function localInstant(calendarDate: number, hour: number): number {
  const target = calendarDate + hour * 3_600_000;
  let instant = target;
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(parts.formatToParts(instant).map(({ type, value }) => [type, value]));
    const represented = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    instant += target - represented;
  }
  return instant;
}

export function upcomingOccurrences(now: number) {
  let date = FIRST_DATE + Math.max(0, Math.floor((now - FIRST_DATE) / (14 * DAY))) * 14 * DAY;
  while (localInstant(date, 22) <= now) date += 14 * DAY;
  return Array.from({ length: UPCOMING_COUNT }, (_, i) => {
    const day = date + i * 14 * DAY;
    return {
      occurrenceKey: new Date(day).toISOString().slice(0, 10),
      startsAt: localInstant(day, 19), endsAt: localInstant(day, 22),
      registrationCutoff: localInstant(day - 2 * DAY, 16)
    };
  });
}

export function registrationOpensAt(startsAt: number) {
  const date = Object.fromEntries(parts.formatToParts(startsAt).map(({ type, value }) => [type, value]));
  const day = Date.UTC(+date.year, +date.month - 1, +date.day);
  // The launch's first two gatherings are open immediately. Later gatherings
  // open the local day after the occurrence two dinners before them.
  return day <= FIRST_DATE + 14 * DAY ? 0 : localInstant(day - 27 * DAY, 0);
}

export function availability(event: { status: string; registrationCutoff: number; capacity: number; registrationOpensAt?: number }, confirmed: number, now: number) {
  if (event.status === 'cancelled') return 'cancelled';
  if (now >= event.registrationCutoff) return 'closed';
  if (now < (event.registrationOpensAt ?? 0)) return 'not_open';
  if (confirmed >= event.capacity) return 'waiting_list';
  return confirmed * 5 >= event.capacity * 4 ? 'almost_full' : 'available';
}
