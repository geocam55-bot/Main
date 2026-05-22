import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

const supabase = createClient();

export async function getAllNotesClient(scope: 'personal' | 'team' = 'personal') {
  try {
    // Try to get user, with fallback to session
    let authUser;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Fallback: check if there's a session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        authUser = session.user;
      } else {
        // Silently return empty during initial load
        return { notes: [] };
      }
    } else {
      authUser = user;
    }

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(authUser.id);
    } catch (profileError) {
      // Failed to get user profile
      return { notes: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    // Notes scope filtering based on role

    let query = supabase
      .from('notes')
      .select('*');

    // Apply scope-based filtering
    if (scope === 'personal') {
      // Personal scope: filter by owner_id only — your own notes regardless of org
      // Personal View - Loading only own notes
      query = query.eq('owner_id', authUser.id);
    } else {
      // Team scope: role-based filtering
      if (userRole === 'super_admin') {
        if (userOrgId) {
          query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
        }
      } else if (['admin', 'manager', 'director', 'marketing'].includes(userRole)) {
        // Team View - Loading all notes for organization
        if (userOrgId) {
          query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
        }
      } else {
        // Standard User - Loading only own notes
        query = query.eq('owner_id', authUser.id);
      }
    }

    const { data: notes, error } = await query.order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.code === 'PGRST204') {
        // Notes table not found, returning empty array
        return { notes: [] };
      }
      // Error loading notes
      throw error;
    }

    // Notes query complete

    return { notes: notes || [] };
  } catch (error: any) {
    // Error in notes client
    return { notes: [] };
  }
}

export async function createNoteClient(noteData: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    let organizationId = user.user_metadata?.organizationId;
    
    // Fetch org ID from profile if missing in metadata
    if (!organizationId) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        if (profile) organizationId = profile.organization_id;
      } catch (e) {
        // ignore
      }
    }

    // Also try localStorage fallback (set during login in App.tsx)
    if (!organizationId) {
      try {
        organizationId = localStorage.getItem('currentOrgId');
      } catch (e) {
        // ignore
      }
    }

    // Resolved organization_id for note creation

    const newNote = {
      title: noteData.title,
      content: noteData.content,
      contact_id: noteData.contact_id || null,
      organization_id: organizationId,
      owner_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Creating note

    const { data: note, error } = await supabase
      .from('notes')
      .insert([newNote])
      .select()
      .single();

    if (error) {
      // Error creating note
      throw error;
    }

    return { note };
  } catch (error: any) {
    // Error creating note
    throw error;
  }
}

export async function deleteNoteClient(id: string) {
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      // Error deleting note
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    // Error deleting note
    throw error;
  }
}

export async function getNotesByContactClient(contactId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { notes: [] };

    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) {
      // Error loading notes by contact
      return { notes: [] };
    }

    return { notes: notes || [] };
  } catch (error: any) {
    // Error loading notes by contact
    return { notes: [] };
  }
}
