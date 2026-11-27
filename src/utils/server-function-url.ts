import { getSupabaseUrl } from './supabase/client';

const DEPLOYED_FUNCTION_ROUTE = 'make-server-8405be07';

export function buildServerFunctionUrl(path = ''): string {
  const normalizedPath = path
    ? (path.startsWith('/') ? path : `/${path}`)
    : '';

  return `${getSupabaseUrl()}/functions/v1/${DEPLOYED_FUNCTION_ROUTE}${normalizedPath}`;
}