import { requireAdmin } from '$lib/server/admin/auth';
export const load = (event: import('./$types').LayoutServerLoadEvent) => {
  const { admin } = requireAdmin(event);
  return { admin };
};
