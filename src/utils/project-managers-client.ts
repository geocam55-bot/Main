import { createClient } from './supabase/client';

export async function getAllProjectManagersClient() {
  const supabase = createClient();
  
  const { data: projectManagers, error } = await supabase
    .from('project_managers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    // Error loading project managers
    // Throw error if table not found so UI can detect it
    if (error.code === 'PGRST205' || error.code === '42P01') {
      throw error;
    }
    return { projectManagers: [] };
  }

  return { projectManagers: projectManagers || [] };
}

export async function getProjectManagersByCustomerClient(customerId: string) {
  const supabase = createClient();
  
  if (!customerId) {
    // No customer ID provided
    return { projectManagers: [] };
  }
  
  const { data: projectManagers, error } = await supabase
    .from('project_managers')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    // Error loading project managers for customer
    // Throw error if table not found so UI can detect it
    if (error.code === 'PGRST205' || error.code === '42P01') {
      throw error;
    }
    return { projectManagers: [] };
  }

  return { projectManagers: projectManagers || [] };
}

export async function createProjectManagerClient(data: any) {
  const supabase = createClient();

  // Get current user to retrieve organization_id
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const organizationId = user.user_metadata?.organizationId;
  
  if (!organizationId) {
    throw new Error('Organization ID not found');
  }

  const projectManagerData = {
    customer_id: data.customerId,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    mailing_address: data.mailingAddress || null,
    organization_id: organizationId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: projectManager, error } = await supabase
    .from('project_managers')
    .insert(projectManagerData)
    .select()
    .single();

  if (error) {
    // Error creating project manager
    throw new Error(error.message);
  }

  return {
    projectManager: {
      ...projectManager,
      customerId: projectManager.customer_id,
      mailingAddress: projectManager.mailing_address,
      createdAt: projectManager.created_at,
      updatedAt: projectManager.updated_at,
    },
  };
}

export async function updateProjectManagerClient(id: string, data: any) {
  const supabase = createClient();
  
  const updateData = {
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    mailing_address: data.mailingAddress || null,
    updated_at: new Date().toISOString(),
  };

  const { data: projectManager, error } = await supabase
    .from('project_managers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    // Error updating project manager
    throw new Error(error.message);
  }

  return {
    projectManager: {
      ...projectManager,
      customerId: projectManager.customer_id,
      mailingAddress: projectManager.mailing_address,
      createdAt: projectManager.created_at,
      updatedAt: projectManager.updated_at,
    },
  };
}

export async function deleteProjectManagerClient(id: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('project_managers')
    .delete()
    .eq('id', id);

  if (error) {
    // Error deleting project manager
    throw new Error(error.message);
  }

  return { success: true };
}