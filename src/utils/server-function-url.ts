import { getSupabaseUrl } from './supabase/client';

const DEPLOYED_FUNCTION_ROUTE = 'make-server-8405be07';

export function buildServerFunctionUrl(path = ''): string {
  const normalizedPath = path
    ? (path.startsWith('/') ? path : `/${path}`)
    : '';

  return `/functions/v1/make-server-8405be07${normalizedPath}`;
}