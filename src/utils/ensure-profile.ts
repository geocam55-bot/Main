import { createClient } from './supabase/client';
import { projectId, publicAnonKey } from './supabase/info';

/**
 * Ensures that a user profile exists for the given user ID.
 * If the profile doesn't exist, it creates one with default values.
 * 
 * @param userId - The user's ID from auth
 * @returns The user's profile or throws an error
 */
export async function ensureUserProfile(userId: string) {
  const supabase = createClient();
  
  // First, try to get the existing profile
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('role, organization_id, email, manager_id')
    .eq('id', userId)
    .maybeSingle();
  
  if (existingProfile) {
    return existingProfile;
  }
  
  // Profile doesn't exist, try to create it
  
  // Get the user's email from auth - but don't throw if auth check fails
  let user = null;
  let userEmail = 'unknown@example.com';
  
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      // Auth check failed, try session instead
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (session?.user) {
        user = session.user;
        // Using session user in ensureUserProfile
      }
      // Session check also failed if sessionError exists
    } else if (authUser) {
      user = authUser;
    }
  } catch (err: any) {
    // Exception in auth check
  }
  
  if (!user) {
    // User not authenticated in ensureUserProfile
    const errorMessage = 'Your session may have expired. Please refresh your browser (F5) or sign out and sign back in.';
    throw new Error(errorMessage);
  }
  
  userEmail = user.email || user.user_metadata?.email || 'unknown@example.com';
  let organizationId = user.user_metadata?.organizationId || user.user_metadata?.organization_id || null;
  
  // If no organization in metadata, try to find or create one
  if (!organizationId) {
    // No organization_id in user metadata, checking for default organization
    
    // Try to find the default organization
    const { data: defaultOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', 'ProSpaces CRM')
      .maybeSingle();
    
    if (defaultOrg) {
      organizationId = defaultOrg.id;
      // Found default organization
    } else {
      // Create a default organization
      const defaultOrgId = 'default-org';
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          id: defaultOrgId,
          name: 'ProSpaces CRM',
          status: 'active'
        })
        .select()
        .single();
      
      if (!orgError && newOrg) {
        organizationId = newOrg.id;
        // Created default organization
      } else if (orgError?.code === '23505') {
        // Organization already exists (race condition)
        organizationId = defaultOrgId;
        // Using default organization (already exists)
      }
      // Failed to create default organization if other error
    }
  }
  
  // Create the profile with default values
  const newProfileData = {
    id: userId,
    email: userEmail,
    name: user.user_metadata?.name || userEmail.split('@')[0],
    role: 'standard_user', // Default role
    organization_id: organizationId,
    manager_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert(newProfileData)
    .select()
    .single();
  
  if (createError) {
    // If it's a duplicate key error (either email or id), try to fetch the existing profile
    if (createError.code === '23505') {
      // Profile already exists (duplicate key), fetching existing profile
      
      // First try by ID (most common case - profile already exists)
      const { data: profileById, error: fetchByIdError } = await supabase
        .from('profiles')
        .select('role, organization_id, email, manager_id, id')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileById) {
        // Found existing profile by ID
        return profileById;
      }
      
      // If not found by ID, try by email
      const { data: profileByEmail, error: fetchByEmailError } = await supabase
        .from('profiles')
        .select('role, organization_id, email, manager_id, id')
        .eq('email', userEmail)
        .maybeSingle();
      
      if (profileByEmail) {
        // Found existing profile by email
        // Check if this profile matches the user ID
        if (profileByEmail.id === userId) {
          return profileByEmail;
        } else {
          // Email belongs to different user - CRITICAL FIX: Call server endpoint to fix profile mismatch
          
          try {
            const { getServerHeaders } = await import('./server-headers');
            const headers = await getServerHeaders();
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/fix-profile-mismatch`,
              {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  email: userEmail,
                  currentUserId: userId,
                  oldUserId: profileByEmail.id,
                }),
              }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
              // Server failed to fix profile mismatch
              // Return the old profile data as fallback
              return {
                role: profileByEmail.role,
                organization_id: profileByEmail.organization_id,
                email: profileByEmail.email,
                manager_id: profileByEmail.manager_id,
              };
            }

            // Server successfully fixed profile mismatch
            return {
              role: result.profile.role,
              organization_id: result.profile.organization_id,
              email: result.profile.email,
              manager_id: result.profile.manager_id,
            };
          } catch (fetchError: any) {
            // Failed to call server endpoint
            // Return the old profile data as fallback
            return {
              role: profileByEmail.role,
              organization_id: profileByEmail.organization_id,
              email: profileByEmail.email,
              manager_id: profileByEmail.manager_id,
            };
          }
        }
      }
    }
    // Failed to create profile (non-duplicate error)
    
    // Try one more time to fetch in case another process created it
    const { data: retryProfile } = await supabase
      .from('profiles')
      .select('role, organization_id, email, manager_id')
      .eq('id', userId)
      .maybeSingle();
    
    if (retryProfile) {
      // Profile found on retry
      return retryProfile;
    }
    
    // Could not create or find profile, returning default profile
    
    // Ensure we have at least a default organization
    const finalOrgId = organizationId || 'default-org';
    
    return {
      role: 'standard_user',
      organization_id: finalOrgId,
      email: userEmail,
      manager_id: null,
    };
  }
  
  // Profile created successfully
  
  // Ensure organization_id is set
  const finalOrgId = newProfile.organization_id || organizationId || 'default-org';
  
  return {
    role: newProfile.role,
    organization_id: finalOrgId,
    email: newProfile.email,
    manager_id: newProfile.manager_id,
  };
}
