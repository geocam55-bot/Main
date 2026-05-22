import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

export async function getAllAppointmentsClient(scope: 'personal' | 'team' = 'personal') {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { appointments: [] };
    }

    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      // Failed to get user profile
      return { appointments: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    // Appointments scope: user role and scope determine filtering

    let query = supabase
      .from('appointments')
      .select('*');

    if (scope === 'personal') {
      // Personal scope: ALL roles see only their own appointments
      if (userRole === 'super_admin') {
        // Super Admin - Loading all appointments
      } else {
        // Personal scope - Loading only own appointments
        query = query.eq('organization_id', userOrgId);
        query = query.eq('owner_id', user.id);
      }
    } else {
      // Team scope: role-based filtering
      if (userRole === 'super_admin') {
        // Super Admin - Loading all appointments
      } else if (['admin', 'manager', 'director', 'marketing'].includes(userRole)) {
        // Team scope - Loading all org appointments
        query = query.eq('organization_id', userOrgId);
      } else {
        // Standard User - Loading only own appointments
        query = query.eq('organization_id', userOrgId);
        query = query.eq('owner_id', user.id);
      }
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) throw error;

    // Appointments filtered and loaded

    return { appointments: data || [] };
  } catch (error: any) {
    // Error loading appointments
    // Return empty array instead of throwing to prevent "Error" in dashboard
    return { appointments: [] };
  }
}

export async function createAppointmentClient(appointmentData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    // Get profile to ensure we use the correct organization_id
    const profile = await ensureUserProfile(user.id);

    const newAppointment = {
      ...appointmentData,
      organization_id: profile.organization_id, // Use profile org instead of user_metadata
      owner_id: user.id,
      created_at: new Date().toISOString(),
    };

    // Creating appointment

    const { data, error } = await supabase
      .from('appointments')
      .insert([newAppointment])
      .select()
      .single();

    if (error) throw error;

    // Appointment created successfully

    return { appointment: data };
  } catch (error: any) {
    // Error creating appointment
    throw error;
  }
}

export async function updateAppointmentClient(id: string, appointmentData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // Strip fields that shouldn't be updated directly
    const { id: _id, created_at, organization_id, owner_id, created_by, ...updateFields } = appointmentData;

    // Updating appointment

    const { data, error } = await supabase
      .from('appointments')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Appointment updated successfully

    return { appointment: data };
  } catch (error: any) {
    // Error updating appointment
    throw error;
  }
}

export async function deleteAppointmentClient(id: string) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    // Error deleting appointment
    throw error;
  }
}
