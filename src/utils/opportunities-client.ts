import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

export async function getAllOpportunitiesClient() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Silently return empty during initial load
      return { opportunities: [] };
    }

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      // Failed to get user profile
      // Return empty array instead of throwing - this prevents "Error" in dashboard
      return { opportunities: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    // Get opportunities without joins (to avoid foreign key errors)
    let query = supabase
      .from('opportunities')
      .select('*');

    // Apply role-based filtering
    if (userRole === 'super_admin') {
      // Super Admin: Can see all opportunities
    } else if (userRole === 'admin') {
      // Admin: Can see ALL opportunities in their organization (for Team Dashboard)
      query = query.eq('organization_id', userOrgId);
    } else if (userRole === 'manager') {
      // Manager: Can see ALL opportunities in their organization (for Team Dashboard)
      query = query.eq('organization_id', userOrgId);
    } else if (userRole === 'director') {
      // Director: Same data access as Manager - sees all organization opportunities
      query = query.eq('organization_id', userOrgId);
    } else if (userRole === 'marketing') {
      // Marketing: Can see all opportunities within their organization (for campaigns)
      query = query.eq('organization_id', userOrgId);
    } else {
      // Standard User: Only show their own opportunities
      query = query.eq('organization_id', userOrgId).eq('owner_id', user.id);
    }

    let { data: opportunities, error } = await query.order('created_at', { ascending: false });

    if (error) {
      // Error loading opportunities
      return { opportunities: [] };
    }

    // Fetch customer names separately to avoid foreign key relationship issues
    const formatted = await Promise.all((opportunities || []).map(async (opp: any) => {
      let customerName = 'Unknown';
      
      if (opp.customer_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('name')
          .eq('id', opp.customer_id)
          .maybeSingle();
        
        if (contact) {
          customerName = contact.name;
        }
      }
      
      return {
        id: opp.id,
        title: opp.title,
        description: opp.description,
        customerId: opp.customer_id,
        customerName,
        // Handle both 'status' and 'stage' columns
        status: opp.status || opp.stage || 'open',
        value: opp.value || 0,
        expectedCloseDate: opp.expected_close_date,
        // Handle both 'owner_id' and 'created_by' columns
        ownerId: opp.owner_id || opp.created_by,
        organizationId: opp.organization_id,
        createdAt: opp.created_at,
        updatedAt: opp.updated_at,
      };
    }));

    return { opportunities: formatted };
  } catch (error) {
    // Unexpected error in getAllOpportunitiesClient
    return { opportunities: [] };
  }
}

export async function getOpportunitiesByCustomerClient(customerId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get user's profile to check their role
  const profile = await ensureUserProfile(user.id);

  const userRole = profile.role;
  const userOrgId = profile.organization_id;

  // IMPORTANT: When viewing a specific contact's opportunities, we need to check
  // if the user has access to the contact first, THEN show ALL opportunities for that contact
  
  // First, verify the user can see this contact
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('id, name, owner_id, organization_id')
    .eq('id', customerId)
    .maybeSingle();
  
  if (contactError) {
    // Error fetching contact
    return { opportunities: [] };
  }
  
  if (!contact) {
    // Contact not found
    return { opportunities: [] };
  }
  
  // Check if user has access to this contact
  const hasContactAccess = 
    userRole === 'super_admin' || // Super admin sees everything
    (userRole === 'admin' && contact.organization_id === userOrgId) || // Admin sees org contacts
    (userRole === 'marketing' && contact.organization_id === userOrgId) || // Marketing sees org contacts
    (userRole === 'manager' && contact.organization_id === userOrgId) || // Manager sees org contacts (TODO: improve manager logic)
    (userRole === 'director' && contact.organization_id === userOrgId) || // Director sees org contacts
    (userRole === 'standard_user' && contact.organization_id === userOrgId); // Standard user sees org contacts (legacy data scenario)
  
  if (!hasContactAccess) {
    // User does not have access to this contact
    return { opportunities: [] };
  }
  
  // Get ALL opportunities for this customer (no ownership filtering)
  // Since we've already verified contact access, show all opportunities for that contact
  let query = supabase
    .from('opportunities')
    .select('*')
    .eq('customer_id', customerId);

  // Only filter by organization to ensure data isolation
  if (userRole !== 'super_admin') {
    query = query.eq('organization_id', userOrgId);
  }

  let { data: opportunities, error } = await query.order('created_at', { ascending: false });

  if (error) {
    // Error loading opportunities by customer
    return { opportunities: [] };
  }

  // Fetch customer name
  let customerName = 'Unknown';
  if (customerId) {
    customerName = contact.name || 'Unknown';
  }

  const formatted = (opportunities || []).map((opp: any) => ({
    id: opp.id,
    title: opp.title,
    description: opp.description,
    customerId: opp.customer_id,
    customerName,
    // Handle both 'status' and 'stage' columns
    status: opp.status || opp.stage || 'open',
    value: opp.value || 0,
    expectedCloseDate: opp.expected_close_date,
    // Handle both 'owner_id' and 'created_by' columns
    ownerId: opp.owner_id || opp.created_by,
    organizationId: opp.organization_id,
    createdAt: opp.created_at,
    updatedAt: opp.updated_at,
  }));

  return { opportunities: formatted };
}

export async function createOpportunityClient(data: any) {
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
  
  // First, check what columns exist in the opportunities table
  // by attempting to select a single row (will reveal column names)
  const { data: sampleRow } = await supabase
    .from('opportunities')
    .select('*')
    .limit(1)
    .maybeSingle();
  
  // Determine which columns are available
  const hasStatus = sampleRow === null || 'status' in (sampleRow || {});
  const hasStage = sampleRow !== null && 'stage' in sampleRow;
  const hasOwnerId = sampleRow === null || 'owner_id' in (sampleRow || {});
  const hasCreatedBy = sampleRow !== null && 'created_by' in sampleRow;
  
  // Build opportunity data based on available columns
  const opportunityData: any = {
    title: data.title,
    description: data.description || '',
    customer_id: data.customerId,
    value: data.value,
    expected_close_date: data.expectedCloseDate,
    organization_id: organizationId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  // Add status or stage depending on what's available
  if (hasStatus) {
    opportunityData.status = data.status;
  } else if (hasStage) {
    opportunityData.stage = data.status;
  }
  
  // Add owner_id or created_by depending on what's available
  if (hasOwnerId) {
    opportunityData.owner_id = user.id;
  } else if (hasCreatedBy) {
    opportunityData.created_by = user.id;
  }

  const { data: opportunity, error } = await supabase
    .from('opportunities')
    .insert(opportunityData)
    .select()
    .single();

  if (error) {
    // Error creating opportunity
    
    // Provide helpful error messages
    if (error.message.includes('owner_id') || error.message.includes('status')) {
      throw new Error('The opportunities table schema is outdated. Please run the FIX-OPPORTUNITIES-COLUMNS.sql migration script in the Supabase SQL Editor.');
    }
    
    if (error.code === 'PGRST204') {
      throw new Error(`Database schema error: ${error.message}. Please check that the opportunities table has been created and migrated correctly.`);
    }
    
    throw new Error(error.message);
  }

  // Fetch customer name
  let customerName = data.customerName || 'Unknown';
  if (opportunity.customer_id) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('name')
      .eq('id', opportunity.customer_id)
      .maybeSingle();
    
    if (contact) {
      customerName = contact.name;
    }
  }

  return {
    opportunity: {
      id: opportunity.id,
      title: opportunity.title,
      description: opportunity.description,
      customerId: opportunity.customer_id,
      customerName,
      status: opportunity.status || opportunity.stage || 'open',
      value: opportunity.value || 0,
      ownerId: opportunity.owner_id || opportunity.created_by || user.id,
      organizationId: opportunity.organization_id,
      expectedCloseDate: opportunity.expected_close_date,
      createdAt: opportunity.created_at,
      updatedAt: opportunity.updated_at,
    },
  };
}

export async function updateOpportunityClient(id: string, data: any) {
  const supabase = createClient();
  
  // Check which columns exist
  const { data: sampleRow } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  const hasStatus = sampleRow && 'status' in sampleRow;
  const hasStage = sampleRow && 'stage' in sampleRow;
  
  const updateData: any = {
    title: data.title,
    description: data.description,
    customer_id: data.customerId,
    value: data.value,
    expected_close_date: data.expectedCloseDate,
    updated_at: new Date().toISOString(),
  };
  
  // Add status or stage based on what exists
  if (hasStatus) {
    updateData.status = data.status;
  } else if (hasStage) {
    updateData.stage = data.status;
  }

  const { data: opportunity, error } = await supabase
    .from('opportunities')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    // Error updating opportunity
    throw new Error(error.message);
  }

  // Fetch customer name
  let customerName = data.customerName || 'Unknown';
  if (opportunity.customer_id) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('name')
      .eq('id', opportunity.customer_id)
      .maybeSingle();
    
    if (contact) {
      customerName = contact.name;
    }
  }

  return {
    opportunity: {
      id: opportunity.id,
      title: opportunity.title,
      description: opportunity.description,
      customerId: opportunity.customer_id,
      customerName,
      status: opportunity.status || opportunity.stage || 'open',
      value: opportunity.value || 0,
      ownerId: opportunity.owner_id || opportunity.created_by,
      organizationId: opportunity.organization_id,
      expectedCloseDate: opportunity.expected_close_date,
      createdAt: opportunity.created_at,
      updatedAt: opportunity.updated_at,
    },
  };
}

export async function deleteOpportunityClient(id: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', id);

  if (error) {
    // Error deleting opportunity
    throw new Error(error.message);
  }

  return { success: true };
}