import { createClient } from './supabase/client';
import { getAllCampaignsClient, createCampaignClient, updateCampaignClient, deleteCampaignClient, sendCampaignClient } from './campaigns-client';
import { getAllQuotesClient, getQuotesByOpportunityClient, createQuoteClient, updateQuoteClient, deleteQuoteClient, getQuoteTrackingStatusClient, fixQuoteOrganizationIds } from './quotes-client';
import { getAllInventoryClient, createInventoryClient, updateInventoryClient, deleteInventoryClient, upsertInventoryBySKUClient, bulkUpsertInventoryBySKUClient, searchInventoryClient, regenerateInventoryKeywordsClient, regenerateAllInventoryKeywordsClient } from './inventory-client';
import type { RegenerateAllKeywordsProgress } from './inventory-client';
import { getAllProjectManagersClient, getProjectManagersByCustomerClient, createProjectManagerClient, updateProjectManagerClient, deleteProjectManagerClient } from './project-managers-client';
import { getAllContactsClient, createContactClient, updateContactClient, deleteContactClient, claimUnassignedContactsClient, upsertContactByLegacyNumberClient, getSegmentsClient } from './contacts-client';
import { diagnoseContactsRLS } from './contacts-diagnostic';
import { getAllUsersClient, inviteUserClient, updateUserClient, deleteUserClient, resetPasswordClient } from './users-client';
import { getAllAppointmentsClient, createAppointmentClient, updateAppointmentClient, deleteAppointmentClient } from './appointments-client';
import { getAllBidsClient, getBidsByOpportunityClient, createBidClient, updateBidClient, deleteBidClient, fixBidOrganizationIds } from './bids-client';
import { getAllTasksClient, createTaskClient, updateTaskClient, deleteTaskClient } from './tasks-client';
import { getAllNotesClient, createNoteClient, deleteNoteClient, getNotesByContactClient } from './notes-client';
import { getUserPreferencesClient, upsertUserPreferencesClient, getOrganizationSettingsClient, upsertOrganizationSettingsClient, updateOrganizationNameClient, updateUserProfileClient, getOrgMode, setOrgMode } from './settings-client';
import { getJourneys, createJourney, updateJourney, deleteJourney, getLandingPages, createLandingPage, updateLandingPage, deleteLandingPage, getLeadScores, updateLeadScore, getScoringRules, createScoringRule, updateScoringRule, deleteScoringRule, getLeadScoreStats } from './marketing-client';
import { getServerHeaders } from './server-headers';
import { getSupabaseUrl } from './supabase/client';

const supabase = createClient();

const BASE = `${getSupabaseUrl()}/functions/v1/make-server-8405be07`;

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// Auth APIs - use Supabase Auth directly
export const authAPI = {
  signup: async (data: { email: string; password: string; name: string; organizationId?: string; role?: string }) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          organizationId: data.organizationId,
          role: data.role || 'standard_user',
        }
      }
    });

    if (error) throw error;
    return { user: authData.user, session: authData.session };
  },

  signin: async (data: { email: string; password: string }) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;
    return { user: authData.user, session: authData.session };
  },

  signout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  },

  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    // If we have a session, fetch the user's profile from the database
    if (session?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        // Return session without profile data if profile fetch fails
        return { session, user: null };
      }
      
      // Construct user object with profile data
      const user = {
        id: profile.id,
        email: profile.email || session.user.email,
        name: profile.name || session.user.user_metadata?.name || '',
        role: profile.role || 'standard_user',
        organizationId: profile.organization_id,
        managerId: profile.manager_id,
      };
      
      return { session, user };
    }
    
    return { session, user: null };
  },
};

// Security APIs - use direct Supabase client
export const securityAPI = {
  getPermissions: async () => {
    const { data, error } = await supabase
      .from('permissions')
      .select('*');
    
    if (error) throw error;
    return { permissions: data || [] };
  },
  updatePermissions: async (permissions: any) => {
    const { error } = await supabase
      .from('permissions')
      .upsert(permissions);
    
    if (error) throw error;
    return { success: true };
  },
  getAuditLogs: async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') return { logs: [] };
      throw error;
    }
    return { logs: data || [] };
  },
};

// Tenants APIs - use direct Supabase client
export const tenantsAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    const orgs = data || [];

    // Fetch user + contact counts from server (bypasses RLS via service role key)
    let orgStats: Record<string, { userCount: number; contactsCount: number }> = {};
    if (orgs.length > 0) {
      try {
        const hdrs = await getServerHeaders();
        const orgIdList = orgs.map(o => o.id).join(',');
        const statsResp = await fetch(`${BASE}/org-stats?org_ids=${encodeURIComponent(orgIdList)}`, { headers: hdrs });
        if (statsResp.ok) {
          const json = await statsResp.json();
          orgStats = json.stats || {};
        } else {
        }
      } catch (statsErr) {
      }
    }

    // Build tenant objects, using server stats when available
    const tenantsWithCounts = await Promise.all(orgs.map(async (org) => {
      // Use server-side stats if available; fall back to client-side queries
      let userCount = orgStats[org.id]?.userCount;
      let contactsCount = orgStats[org.id]?.contactsCount;

      if (userCount == null) {
        const { count, error: ue } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', org.id);
        userCount = count ?? 0;
      }
      if (contactsCount == null) {
        const { count, error: ce } = await supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', org.id);
        contactsCount = count ?? 0;
      }

      // Fetch extra org details from KV (domain, plan, billing_email, phone, address, notes, features)
      let kvDetails: any = {};
      try {
        const hdrs = await getServerHeaders();
        const resp = await fetch(`${BASE}/settings/org-details/${org.id}`, { headers: hdrs });
        if (resp.ok) {
          const json = await resp.json();
          kvDetails = json.details || {};
        }
      } catch (_kvErr) {
        // Non-critical: KV details not available, use DB defaults
      }

      // Fetch subscription to get authoritative plan
      let subPlan: string | null = null;
      try {
        const hdrs = await getServerHeaders();
        const subResp = await fetch(`${BASE}/subscriptions/current?org_override=${org.id}`, { headers: hdrs });
        if (subResp.ok) {
          const subJson = await subResp.json();
          if (subJson.subscription?.plan_id) {
            subPlan = subJson.subscription.plan_id;
          }
        }
      } catch (_subErr) {
        // Non-critical
      }
      
      return {
        id: org.id,
        name: org.name,
        domain: kvDetails.domain || org.domain || '',
        status: org.status || 'active',
        plan: subPlan || kvDetails.plan || org.plan || 'starter',
        customPlanPrice: kvDetails.custom_plan_price || '',
        logo: org.logo || '',
        billingEmail: kvDetails.billing_email || org.billing_email || '',
        phone: kvDetails.phone || org.phone || '',
        address: kvDetails.address || org.address || '',
        notes: kvDetails.notes || org.notes || '',
        features: kvDetails.features || (org.features ? (typeof org.features === 'string' ? JSON.parse(org.features) : org.features) : []),
        ai_suggestions_enabled: kvDetails.ai_suggestions_enabled ?? org.ai_suggestions_enabled ?? false,
        marketing_enabled: kvDetails.marketing_enabled ?? org.marketing_enabled ?? true,
        inventory_enabled: kvDetails.inventory_enabled ?? org.inventory_enabled ?? true,
        import_export_enabled: kvDetails.import_export_enabled ?? org.import_export_enabled ?? true,
        documents_enabled: kvDetails.documents_enabled ?? org.documents_enabled ?? true,
        project_wizards_enabled: kvDetails.project_wizards_enabled ?? org.project_wizards_enabled ?? true,
        appointments_enabled: kvDetails.appointments_enabled ?? org.appointments_enabled ?? true,
        createdAt: org.created_at,
        updatedAt: org.updated_at,
        userCount: userCount || 0,
        contactsCount: contactsCount || 0,
      };
    }));
    
    return { tenants: tenantsWithCounts };
  },
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { tenant: data };
  },
  getCurrent: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const organizationId = user.user_metadata?.organizationId;
    if (!organizationId) return { tenant: null };
    
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return { tenant: null };
      throw error;
    }
    return { tenant: data };
  },
  create: async (data: any) => {
    const hdrs = await getServerHeaders();
    const resp = await fetch(`${BASE}/tenants`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify(data),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(err.error || 'Failed to create organization');
    }
    const result = await resp.json();
    return result;
  },
  update: async (id: string, data: any) => {
    const hdrs = await getServerHeaders();
    const resp = await fetch(`${BASE}/tenants/${id}`, {
      method: 'PUT',
      headers: hdrs,
      body: JSON.stringify(data),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(err.error || 'Failed to update organization');
    }
    const result = await resp.json();
    return result;
  },
  updateFeatures: async (id: string, features: Record<string, any>) => {
    const hdrs = await getServerHeaders();
    const resp = await fetch(`${BASE}/tenants/${id}/features`, {
      method: 'PATCH',
      headers: hdrs,
      body: JSON.stringify(features),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(err.error || 'Failed to update features');
    }
    return await resp.json();
  },
  delete: async (id: string) => {
    const hdrs = await getServerHeaders();
    const resp = await fetch(`${BASE}/tenants/${id}`, {
      method: 'DELETE',
      headers: hdrs,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(err.error || 'Failed to delete organization');
    }
    const result = await resp.json();
    return result;
  },
};

// Subscription Agreement APIs - use KV store
export const subscriptionAgreementAPI = {
  get: async (organizationId: string) => {
    const hdrs = await getServerHeaders();
    const resp = await fetch(`${BASE}/kv/get/subscription_agreement_${organizationId}`, {
      headers: hdrs,
    });
    if (!resp.ok) {
      if (resp.status === 404) return { agreement: null };
      throw new Error('Failed to fetch subscription agreement');
    }
    const result = await resp.json();
    let parsedAgreement = result.value;
    if (typeof parsedAgreement === 'string') {
      try {
        parsedAgreement = JSON.parse(parsedAgreement);
      } catch (e) {
        // parse error, use raw value
      }
    }
    return { agreement: parsedAgreement || null };
  },
  save: async (organizationId: string, agreementData: any) => {
    const hdrs = await getServerHeaders();
    const resp = await fetch(`${BASE}/kv/set`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({
        key: `subscription_agreement_${organizationId}`,
        value: agreementData,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Failed to save subscription agreement: ${resp.status}`);
    }
    return await resp.json();
  },
};

// Inventory APIs - use direct Supabase client
export const inventoryAPI = {
  getAll: () => getAllInventoryClient(),
  create: (data: any) => createInventoryClient(data),
  update: (id: string, data: any) => updateInventoryClient(id, data),
  delete: (id: string) => deleteInventoryClient(id),
  upsertBySKU: (data: any) => upsertInventoryBySKUClient(data),
  bulkUpsertBySKU: (data: any) => bulkUpsertInventoryBySKUClient(data),
  regenerateKeywords: (id: string) => regenerateInventoryKeywordsClient(id),
  regenerateAllKeywords: (onProgress?: (progress: RegenerateAllKeywordsProgress) => void) => regenerateAllInventoryKeywordsClient(onProgress),
  search: (filters?: { search?: string; category?: string; status?: string; organizationId?: string }) => searchInventoryClient(filters),
};

// Email APIs - route through consolidated server (email_accounts has RLS)
export const emailAPI = {
  // Email accounts - via server endpoint to bypass RLS
  getAccounts: async () => {
    try {
      const headers = await getServerHeaders();
      const res = await fetch(
        `${BASE}/email-accounts`,
        { headers }
      );
      if (!res.ok) {
        return { accounts: [] };
      }
      const json = await res.json();
      return { accounts: json.accounts || [] };
    } catch (error) {
      return { accounts: [] };
    }
  },
  addAccount: async (accountData: any) => {
    const headers = await getServerHeaders();
    const res = await fetch(
      `${BASE}/email-accounts`,
      { method: 'POST', headers, body: JSON.stringify(accountData) }
    );
    if (!res.ok) throw new Error('Failed to add email account');
    const json = await res.json();
    return { account: json.account || json };
  },
  deleteAccount: async (id: string) => {
    const headers = await getServerHeaders();
    const res = await fetch(
      `${BASE}/email-accounts/${id}`,
      { method: 'DELETE', headers }
    );
    if (!res.ok) throw new Error('Failed to delete email account');
    return { success: true };
  },
  syncAccount: async (id: string) => {
    try {
      const headers = await getServerHeaders();
      const res = await fetch(
        `${BASE}/email-sync`,
        { method: 'POST', headers, body: JSON.stringify({ accountId: id, limit: 50 }) }
      );
      if (!res.ok) throw new Error('Sync failed');
      return await res.json();
    } catch (error: any) {
      // emailAPI.syncAccount failed
      return { success: false, error: error.message };
    }
  },
  
  // Emails
  getEmails: async (scope: 'personal' | 'team' = 'personal') => {
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('emails')
      .select('*');

    // Personal scope: only show user's own emails
    if (scope === 'personal' && user) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('received_at', { ascending: false });
    
    if (error) {
      if (error.code === '42P01') return { emails: [] };
      throw error;
    }
    return { emails: data || [] };
  },
  sendEmail: async (emailData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

      // Map fields to match database schema, similar to saveEmailToSupabase in Email.tsx
    const newEmail = {
      user_id: user.id,
      organization_id: user.user_metadata?.organizationId,
      account_id: emailData.account_id || emailData.accountId,
      message_id: emailData.message_id || emailData.id || crypto.randomUUID(),
      from_email: emailData.from_email || emailData.from,
      to_email: emailData.to_email || emailData.to,
      subject: emailData.subject,
      body: emailData.body,
      is_read: emailData.is_read !== undefined ? emailData.is_read : (emailData.read !== undefined ? emailData.read : true),
      is_starred: emailData.is_starred !== undefined ? emailData.is_starred : (emailData.starred || false),
      folder: emailData.folder || 'sent',
      received_at: emailData.received_at || emailData.date || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('emails')
      .insert([newEmail])
      .select()
      .single();
    
    if (error) throw error;
    return { email: data };
  },
  updateEmail: async (id: string, emailData: any) => {
    const { data, error } = await supabase
      .from('emails')
      .update(emailData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { email: data };
  },
  deleteEmail: async (id: string) => {
    const { error } = await supabase
      .from('emails')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },
};

// Project Managers APIs - use direct Supabase client
export const projectManagersAPI = {
  getAll: () => getAllProjectManagersClient(),
  getByCustomer: (customerId: string) => getProjectManagersByCustomerClient(customerId),
  create: (data: any) => createProjectManagerClient(data),
  update: (id: string, data: any) => updateProjectManagerClient(id, data),
  delete: (id: string) => deleteProjectManagerClient(id),
};

// Contacts APIs - uses server endpoint (bypasses RLS) with client-side fallback
export const contactsAPI = {
  getAll: (scope: 'personal' | 'team' = 'personal') => getAllContactsClient(undefined, scope),
  create: (data: any) => createContactClient(data),
  update: (id: string, data: any) => updateContactClient(id, data),
  delete: (id: string) => deleteContactClient(id),
  claimUnassigned: () => claimUnassignedContactsClient(),
  upsertByLegacyNumber: (data: any, preloadedAuth?: { userId: string; profile: any }) => upsertContactByLegacyNumberClient(data, preloadedAuth),
  diagnoseRLS: () => diagnoseContactsRLS(),
  getSegments: () => getSegmentsClient(),
};

// Users APIs - use direct Supabase client
export const usersAPI = {
  getAll: () => getAllUsersClient(),
  invite: (data: { email: string; name: string; role: string; organizationName?: string }) => inviteUserClient(data),
  update: (id: string, data: any) => updateUserClient(id, data),
  delete: (id: string) => deleteUserClient(id),
  resetPassword: (userId: string, newPassword: string) => resetPasswordClient(userId, newPassword),
};

// Appointments APIs - use direct Supabase client
export const appointmentsAPI = {
  getAll: (scope: 'personal' | 'team' = 'personal') => getAllAppointmentsClient(scope),
  create: (data: any) => createAppointmentClient(data),
  update: (id: string, data: any) => updateAppointmentClient(id, data),
  delete: (id: string) => deleteAppointmentClient(id),
};

// Bids APIs - use direct Supabase client
export const bidsAPI = {
  getAll: (scope: 'personal' | 'team' = 'personal') => getAllBidsClient(scope),
  getByOpportunity: (opportunityId: string) => getBidsByOpportunityClient(opportunityId),
  create: (data: any) => createBidClient(data),
  update: (id: string, data: any) => updateBidClient(id, data),
  delete: (id: string) => deleteBidClient(id),
  fixOrganizationIds: () => fixBidOrganizationIds(),
};

// Tasks APIs - use direct Supabase client
export const tasksAPI = {
  getAll: (scope: 'personal' | 'team' = 'personal') => getAllTasksClient(scope),
  create: (data: any) => createTaskClient(data),
  update: (id: string, data: any) => updateTaskClient(id, data),
  delete: (id: string) => deleteTaskClient(id),
};

// Notes APIs - use direct Supabase client
export const notesAPI = {
  getAll: (scope: 'personal' | 'team' = 'personal') => getAllNotesClient(scope),
  getByContact: (contactId: string) => getNotesByContactClient(contactId),
  create: (data: any) => createNoteClient(data),
  delete: (id: string) => deleteNoteClient(id),
};

// Settings APIs - use direct Supabase client
export const settingsAPI = {
  getUserPreferences: (userId: string, organizationId: string) => getUserPreferencesClient(userId, organizationId),
  upsertUserPreferences: (data: any) => upsertUserPreferencesClient(data),
  getOrganizationSettings: (organizationId: string) => getOrganizationSettingsClient(organizationId),
  upsertOrganizationSettings: (data: any) => upsertOrganizationSettingsClient(data),
  updateOrganizationName: (organizationId: string, name: string) => updateOrganizationNameClient(organizationId, name),
  updateUserProfile: (userId: string, data: any) => updateUserProfileClient(userId, data),
  getOrgMode: (organizationId: string) => getOrgMode(organizationId),
  setOrgMode: (organizationId: string, mode: 'single' | 'multi') => setOrgMode(organizationId, mode),
};

// Campaigns APIs - use direct Supabase client
export const campaignsAPI = {
  getAll: () => getAllCampaignsClient(),
  create: (data: any) => createCampaignClient(data),
  update: (id: string, data: any) => updateCampaignClient(id, data),
  delete: (id: string) => deleteCampaignClient(id),
  send: (id: string) => sendCampaignClient(id),
};

// Quotes APIs - use direct Supabase client
export const quotesAPI = {
  getAll: (scope: 'personal' | 'team' = 'personal') => getAllQuotesClient(scope),
  getByOpportunity: (opportunityId: string) => getQuotesByOpportunityClient(opportunityId),
  create: (data: any) => createQuoteClient(data),
  update: (id: string, data: any) => updateQuoteClient(id, data),
  delete: (id: string) => deleteQuoteClient(id),
  getTrackingStatus: (id: string) => getQuoteTrackingStatusClient(id),
  fixOrganizationIds: () => fixQuoteOrganizationIds(),
};

// Journeys APIs
export const journeysAPI = {
  getAll: (organizationId: string) => getJourneys(organizationId),
  create: (data: any, organizationId: string) => createJourney(data, organizationId),
  update: (id: string, data: any) => updateJourney(id, data),
  delete: (id: string) => deleteJourney(id),
};

// Landing Pages APIs
export const landingPagesAPI = {
  getAll: (organizationId: string) => getLandingPages(organizationId),
  create: (data: any, organizationId: string) => createLandingPage(data, organizationId),
  update: (id: string, data: any) => updateLandingPage(id, data),
  delete: (id: string) => deleteLandingPage(id),
};

// Lead Scoring APIs
export const leadScoresAPI = {
  getAll: (organizationId: string) => getLeadScores(organizationId),
  updateScore: (contactId: string, organizationId: string, score: number, action: string) => updateLeadScore(contactId, organizationId, score, action),
  getRules: (organizationId: string) => getScoringRules(organizationId),
  createRule: (data: any, organizationId: string) => createScoringRule(data, organizationId),
  updateRule: (id: string, data: any) => updateScoringRule(id, data),
  deleteRule: (id: string) => deleteScoringRule(id),
  getStats: (organizationId: string) => getLeadScoreStats(organizationId),
};