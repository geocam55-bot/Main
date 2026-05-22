import { createClient } from './supabase/client';

const supabase = createClient();

/**
 * Diagnostic function to check what's actually in the contacts table
 * This bypasses normal filtering to show RLS issues
 * Returns structured diagnostic data instead of logging to console.
 */
export async function diagnoseContactsRLS() {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        error: 'No authenticated user found',
        user: null,
        contacts: null
      };
    }
    
    // Try to query contacts table without any filters
    const { data: allContacts, error: contactsError, count } = await supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .limit(100); // Limit to prevent overwhelming
    
    // Try to check RLS policies (this will only work if we have service role access)
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'contacts' })
      .single();
    
    return {
      user: {
        email: user.email,
        id: user.id,
        organizationId: user.user_metadata?.organizationId,
        role: user.user_metadata?.role
      },
      contacts: allContacts,
      totalCount: count,
      error: contactsError,
      policies: policiesError ? null : policies
    };
    
  } catch (error: any) {
    // Diagnostic failed
    return {
      error: error.message,
      user: null,
      contacts: null
    };
  }
}
