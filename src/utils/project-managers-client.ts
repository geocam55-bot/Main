// @ts-nocheck
import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

const supabase = createClient();

export async function getAllProjectManagersClient() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { projectManagers: [] };
      }
    }

    const { data, error } = await supabase
      .from('project_managers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST204') {
        return { projectManagers: [], tableNotFound: true };
      }
      throw error;
    }

    return { projectManagers: data || [] };
  } catch (error: any) {
    return { projectManagers: [] };
  }
}

export async function getProjectManagersByCustomerClient(customerId: string) {
  try {
    if (!customerId) return { projectManagers: [] };

    const { data, error } = await supabase
      .from('project_managers')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST204') {
        return { projectManagers: [], tableNotFound: true };
      }
      throw error;
    }

    return { projectManagers: data || [] };
  } catch (error: any) {
    return { projectManagers: [] };
  }
}

export async function createProjectManagerClient(pmData: any) {
  try {
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

    const newPm = {
      ...pmData,
      organization_id: organizationId || pmData.organization_id || '',
    };

    const { data, error } = await supabase
      .from('project_managers')
      .insert([newPm])
      .select()
      .single();

    if (error) throw error;

    return { projectManager: data };
  } catch (error: any) {
    throw error;
  }
}

export async function updateProjectManagerClient(id: string, pmData: any) {
  try {
    const { data, error } = await supabase
      .from('project_managers')
      .update(pmData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { projectManager: data };
  } catch (error: any) {
    throw error;
  }
}

export async function deleteProjectManagerClient(id: string) {
  try {
    const { error } = await supabase
      .from('project_managers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    throw error;
  }
}
