import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

export function fixProfileMismatch(app: Hono) {
  app.post('/make-server-8405be07/fix-profile-mismatch', async (c) => {
    try {
      const { email, currentUserId, oldUserId } = await c.req.json();

      console.log('🔧 Fixing profile mismatch for:', email);
      console.log('Current User ID:', currentUserId);
      console.log('Old User ID:', oldUserId);

      // Create Supabase client with service role key (elevated permissions)
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // First, fetch the old profile data
      const { data: oldProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (fetchError || !oldProfile) {
        console.error('❌ Failed to fetch old profile:', fetchError);
        return c.json({ 
          success: false, 
          error: 'Failed to fetch existing profile' 
        }, 500);
      }

      console.log('✅ Found old profile:', oldProfile.id);

      // Delete the old profile using service role (bypasses RLS)
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('email', email);

      if (deleteError) {
        console.error('❌ Failed to delete old profile:', deleteError);
        return c.json({ 
          success: false, 
          error: `Failed to delete old profile: ${deleteError.message}` 
        }, 500);
      }

      console.log('✅ Old profile deleted');

      // Create new profile with correct ID
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: currentUserId,
          email: oldProfile.email,
          name: oldProfile.name || 'User',
          role: oldProfile.role || 'standard_user',
          organization_id: oldProfile.organization_id,
          status: oldProfile.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create new profile:', createError);
        return c.json({ 
          success: false, 
          error: `Failed to create new profile: ${createError.message}` 
        }, 500);
      }

      console.log('✅ New profile created successfully with correct ID');

      return c.json({ 
        success: true, 
        profile: newProfile 
      });

    } catch (error: any) {
      console.error('❌ Error in fix-profile-mismatch:', error);
      return c.json({ 
        success: false, 
        error: error.message || 'Unknown error' 
      }, 500);
    }
  });
}