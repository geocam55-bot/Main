/**
 * Shared auth helper for server-side endpoints.
 *
 * Clients should send two headers:
 *   Authorization: Bearer <publicAnonKey>   — required by the Supabase gateway
 *   X-User-Token: <session.access_token>    — the actual user JWT for user-level auth
 *
 * This helper reads the user token from X-User-Token first, falling back to
 * Authorization for backward compatibility.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Extract the user's JWT from the request headers.
 * Prefers `X-User-Token`, falls back to `Authorization: Bearer ...`.
 */
export function extractUserToken(c: any): string | null {
  // Prefer the dedicated user-token header
  const userToken = c.req.header('X-User-Token');
  if (userToken) return userToken;

  // Fallback: Authorization header — but ONLY if it does NOT look like the
  // Supabase anon key (which the gateway requires but is not a user JWT).
  // Anon keys are short JWTs (~200 chars); user access tokens are longer (~800+).
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1] || null;
    if (token && token.length > 300) return token; // likely a real user JWT
  }

  return null;
}

/**
 * Authenticate the calling user and return their profile.
 * Returns { user, profile, supabase } on success, or { error, status } on failure.
 */
export async function authenticateRequest(c: any): Promise<{
  error: string | null;
  status: number;
  supabase: any;
  user: any;
  profile: any;
}> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const accessToken = extractUserToken(c);
  if (!accessToken) {
    return { error: 'Missing authentication token (send X-User-Token header)', status: 401, supabase, user: null, profile: null };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    return {
      error: 'Unauthorized: ' + (authError?.message || 'No user found for token'),
      status: 401,
      supabase,
      user: null,
      profile: null,
    };
  }

  // Get the user's profile for role and organization
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      error: 'Profile not found for user ' + user.id,
      status: 404,
      supabase,
      user,
      profile: null,
    };
  }

  return { error: null, status: 200, supabase, user, profile };
}