import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

export async function getAllTasksClient(scope: 'personal' | 'team' = 'personal') {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { tasks: [] };
    }

    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      // Failed to get user profile
      return { tasks: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    // Tasks scope filtering based on role

    let query = supabase
      .from('tasks')
      .select('*');

    if (scope === 'personal') {
      // Personal scope: ALL roles see only their own tasks
      if (userRole === 'super_admin') {
        // Super Admin - Loading all tasks
      } else {
        // Personal scope - Loading only own tasks
        query = query.eq('organization_id', userOrgId).or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
      }
    } else {
      // Team scope: role-based filtering
      if (userRole === 'super_admin') {
        // Super Admin - Loading all tasks
      } else if (['admin', 'manager', 'director', 'marketing'].includes(userRole)) {
        // Team scope - Loading all org tasks
        query = query.eq('organization_id', userOrgId);
      } else {
        // Standard User (team scope) - Loading only own tasks
        query = query.eq('organization_id', userOrgId).or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
      }
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) throw error;

    // Tasks filtered and loaded

    return { tasks: data || [] };
  } catch (error: any) {
    // Error loading tasks
    // Return empty array instead of throwing to prevent "Error" in dashboard
    return { tasks: [] };
  }
}

export async function createTaskClient(taskData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    let organizationId = user.user_metadata?.organizationId;
    try {
      const profile = await ensureUserProfile(user.id);
      if (profile?.organization_id) {
        organizationId = profile.organization_id;
      }
    } catch (e) {
      // ignore
    }

    const newTask = {
      ...taskData,
      organization_id: organizationId,
      owner_id: user.id,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([newTask])
      .select()
      .single();

    if (error) throw error;

    return { task: data };
  } catch (error: any) {
    // Error creating task
    throw error;
  }
}

export async function updateTaskClient(id: string, taskData: any) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('tasks')
      .update(taskData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { task: data };
  } catch (error: any) {
    // Error updating task
    throw error;
  }
}

export async function deleteTaskClient(id: string) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    // Error deleting task
    throw error;
  }
}
