import { createClient } from 'npm:@supabase/supabase-js@2';

export async function handleResetPassword(c: any) {
  try {
    const { userEmail, tempPassword } = await c.req.json();

    if (!userEmail || !tempPassword) {
      return c.json({ 
        success: false, 
        error: 'Missing required fields: userEmail and tempPassword' 
      }, 400);
    }

    console.log('🔐 Password reset request for:', userEmail);

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return c.json({ 
        success: false, 
        error: `Failed to find user: ${listError.message}` 
      }, 500);
    }

    const user = users.find(u => u.email === userEmail);
    
    if (!user) {
      console.error('❌ User not found:', userEmail);
      return c.json({ 
        success: false, 
        error: 'User not found' 
      }, 404);
    }

    console.log('✅ User found:', user.id);

    // Update user password using admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: tempPassword }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      return c.json({ 
        success: false, 
        error: `Failed to update password: ${updateError.message}` 
      }, 500);
    }

    console.log('✅ Password updated successfully for user:', user.id);

    // Try to update the needs_password_change flag in profiles table
    let profileUpdated = false;
    let profileError = null;

    try {
      // Check if needs_password_change column exists
      const { data: columnCheck } = await supabaseAdmin
        .from('profiles')
        .select('needs_password_change')
        .eq('id', user.id)
        .limit(1)
        .maybeSingle();

      // If we can select it, the column exists
      const columnExists = columnCheck !== null || columnCheck === null;

      if (columnExists) {
        const { error: profileUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({
            needs_password_change: true,
            temp_password: tempPassword,
            temp_password_created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (profileUpdateError) {
          // Column might not exist
          console.warn('⚠️ Could not update profile flags (columns may not exist):', profileUpdateError.message);
          profileError = profileUpdateError.message;
        } else {
          profileUpdated = true;
          console.log('✅ Profile flags updated successfully');
        }
      }
    } catch (err: any) {
      console.warn('⚠️ Profile update skipped (columns may not exist):', err.message);
      profileError = err.message;
    }

    return c.json({
      success: true,
      userId: user.id,
      message: 'Password reset successfully',
      profileUpdated,
      profileError,
      warning: !profileUpdated ? 'Password reset successful, but needs_password_change flag could not be set. Run the database migration to enable this feature.' : null
    });

  } catch (err: any) {
    console.error('❌ Exception in handleResetPassword:', err);
    return c.json({ 
      success: false, 
      error: err.message || 'Internal server error' 
    }, 500);
  }
}
