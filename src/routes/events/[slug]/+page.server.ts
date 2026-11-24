import { error } from '@sveltejs/kit';
import { UPCOMING_COUNT } from '$lib/server/events/schedule';

export const load: import('./$types').PageServerLoad = async ({ platform, params }) => {
  if (!platform?.env.DB) error(404, 'Gathering not found');
  const event = await platform.env.DB.prepare(`SELECT e.id,e.slug,e.starts_at,e.ends_at,e.status,e.description,e.capacity,v.name AS venue,v.address
    FROM events e JOIN venues v ON v.id=e.venue_id
    WHERE e.slug=? AND e.id IN (SELECT id FROM events WHERE ends_at>? ORDER BY starts_at,id LIMIT ?)`)
    .bind(params.slug, Date.now(), UPCOMING_COUNT)
    .first<{ id: string; slug: string; starts_at: number; ends_at: number; status: string; description: string; capacity: number; venue: string; address: string }>();
  if (!event) error(404, 'Gathering not found');
  return { event };
};
