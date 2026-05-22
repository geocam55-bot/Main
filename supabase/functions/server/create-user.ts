import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Server-side user creation endpoint.
 * Uses supabase.auth.admin.createUser() to create a real Supabase Auth account
 * along with a profiles table entry, so the invited user can immediately sign in.
 */
export async function handleCreateUser(c: any) {
  try {
    const { email, name, role, organizationId, tempPassword } = await c.req.json();

    if (!email || !name || !role || !organizationId || !tempPassword) {
      return c.json({
        success: false,
        error: 'Missing required fields: email, name, role, organizationId, tempPassword',
      }, 400);
    }

    console.log('👤 Create user request for:', email, 'org:', organizationId);

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if auth account already exists
    const { data: { users: existingUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return c.json({
        success: false,
        error: `Failed to check existing users: ${listError.message}`,
      }, 500);
    }

    const existingAuthUser = existingUsers?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let authUserId: string;

    if (existingAuthUser) {
      console.log('Auth account already exists for:', email, 'id:', existingAuthUser.id);
      authUserId = existingAuthUser.id;

      // Update the existing auth user's password so they can sign in with the temp password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUserId,
        {
          password: tempPassword,
          email_confirm: true, // Ensure email is confirmed so user can sign in
          user_metadata: {
            name,
            role,
            organizationId,
          },
        }
      );

      if (updateError) {
        console.error('Error updating existing auth user:', updateError);
        return c.json({
          success: false,
          error: `Failed to update existing auth account: ${updateError.message}`,
        }, 500);
      }

      console.log('Updated existing auth account with new password and metadata');
    } else {
      // Create a new Supabase Auth account using admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: tempPassword,
        user_metadata: {
          name,
          role,
          organizationId,
        },
        // Automatically confirm the user's email since an email server hasn't been configured.
        email_confirm: true,
      });

      if (createError) {
        console.error('Error creating auth user:', createError);
        return c.json({
          success: false,
          error: `Failed to create auth account: ${createError.message}`,
        }, 500);
      }

      authUserId = newUser.user.id;
      console.log('Auth account created:', authUserId);
    }

    // Now create or update the profiles table entry
    // First check if profile already exists
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (profileCheckError) {
      console.warn('Warning checking existing profile:', profileCheckError.message);
    }

    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          id: authUserId, // Ensure ID matches auth user
          name,
          role,
          organization_id: organizationId,
          status: 'active',
          needs_password_change: true,
          temp_password: tempPassword,
          temp_password_created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('email', email.toLowerCase())
        .select()
        .single();

      if (updateProfileError) {
        console.warn('Warning updating profile:', updateProfileError.message);
        // Try without needs_password_change columns (they may not exist)
        const { error: retryError } = await supabaseAdmin
          .from('profiles')
          .update({
            id: authUserId,
            name,
            role,
            organization_id: organizationId,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('email', email.toLowerCase());

        if (retryError) {
          console.error('Error updating profile (retry):', retryError);
        }
      }

      console.log('Profile updated for:', email);
    } else {
      // Create new profile
      const profileData: any = {
        id: authUserId,
        email: email.toLowerCase(),
        name,
        role,
        organization_id: organizationId,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Try with password change fields first
      try {
        profileData.needs_password_change = true;
        profileData.temp_password = tempPassword;
        profileData.temp_password_created_at = new Date().toISOString();

        const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert(profileData);

        if (insertError) {
          // Retry without optional columns
          delete profileData.needs_password_change;
          delete profileData.temp_password;
          delete profileData.temp_password_created_at;

          const { error: retryError } = await supabaseAdmin
            .from('profiles')
            .insert(profileData);

          if (retryError) {
            console.error('Error creating profile:', retryError);
            // Non-fatal - auth account was already created
            return c.json({
              success: true,
              userId: authUserId,
              profileCreated: false,
              profileError: retryError.message,
              message: 'Auth account created but profile creation failed. The user can still sign in and a profile will be auto-created on first login.',
            });
          }
        }
      } catch (err: any) {
        console.warn('Profile creation exception:', err.message);
      }

      console.log('Profile created for:', email);
    }

    return c.json({
      success: true,
      userId: authUserId,
      email: email.toLowerCase(),
      profileCreated: true,
      message: `Account created for ${email}. User can sign in with the temporary password.`,
    });
  } catch (err: any) {
    console.error('Exception in handleCreateUser:', err);
    return c.json({
      success: false,
      error: err.message || 'Internal server error',
    }, 500);
  }
}