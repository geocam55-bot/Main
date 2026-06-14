import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractUserToken } from './auth-helper.ts';

// ── Server-side column detection ──────────────────────────────────────
// Probe whether account_owner_number exists, with a TTL so we re-check
// after the user runs the ALTER TABLE SQL.
let _hasAccountOwnerCol: boolean | null = null;
let _aocolCheckTime = 0;
const AOCOL_TTL = 60_000; // re-check every 60 seconds if column was missing

async function hasAccountOwnerColumn(supabase: any): Promise<boolean> {
  // If we already found the column, keep using that (column won't disappear)
  if (_hasAccountOwnerCol === true) return true;
  // If we cached "not found", re-check after TTL in case user ran the SQL
  if (_hasAccountOwnerCol === false && Date.now() - _aocolCheckTime < AOCOL_TTL) return false;

  const { error } = await supabase
    .from('contacts')
    .select('account_owner_number')
    .limit(0);

  _hasAccountOwnerCol = !error;
  _aocolCheckTime = Date.now();
  if (error) {
    console.log('[fix-contact-ownership] account_owner_number column not available:', error.code);
  } else {
    console.log('[fix-contact-ownership] account_owner_number column detected');
  }
  return _hasAccountOwnerCol;
}

async function getOrCreateClientProfile(supabase: any, user: any): Promise<any> {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfile) {
    return existingProfile;
  }

  // If no profile, let's create a new one using the exact fallback flow
  let orgId = user.user_metadata?.organizationId || user.user_metadata?.organization_id || null;
  if (orgId) {
    const { data: orgCheck } = await supabase.from('organizations').select('id').eq('id', orgId).maybeSingle();
    if (!orgCheck) {
      orgId = null;
    }
  }
  if (!orgId) {
    const { data: anyOrg } = await supabase.from('organizations').select('id').limit(1).maybeSingle();
    if (anyOrg) {
      orgId = anyOrg.id;
    } else {
      // Find or create default organization "ProSpaces CRM"
      const defaultOrgId = 'default-org';
      const { data: defaultOrgCheck } = await supabase.from('organizations').select('id').eq('id', defaultOrgId).maybeSingle();
      if (defaultOrgCheck) {
        orgId = defaultOrgCheck.id;
      } else {
        const { data: createdOrg } = await supabase.from('organizations').insert({
          id: defaultOrgId,
          name: 'ProSpaces CRM',
          status: 'active',
          created_at: new Date().toISOString()
        }).select().single();
        orgId = createdOrg?.id || defaultOrgId;
      }
    }
  }

  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert([{
      id: user.id,
      email: user.email || 'unknown@example.com',
      name: user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'User'),
      role: user.user_metadata?.role || 'standard_user',
      organization_id: orgId,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (createError) {
    console.error('Failed to auto-create missing profile:', createError);
    // In case of race condition / already exists
    const { data: retryProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (retryProfile) return retryProfile;

    throw new Error('Could not retrieve or create profile: ' + createError.message);
  }

  console.log('Successfully auto-created missing user profile during contact diagnosis:', newProfile);
  return newProfile;
}

export function fixContactOwnership(app: Hono) {
  // GET: Diagnose contact ownership issues (bypasses RLS)
  app.get('/make-server-8405be07/contacts/diagnose-ownership', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Get the requesting user from the auth headers
      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized: ' + (authError?.message || 'No user') }, 401);
      }

      const inputUserEmail = user.email || user.user_metadata?.email || '';

      // ── AUTO-HEAL: Automatically fix and synchronize organisations and profiles on diagnosis ──
      try {
        console.log('[AUTO-HEAL] Executing background system reconstruction...');
        
        // 1. Ensure organizations exist in Postgres
        const requiredOrgs = [
          { id: '34638283-7b3d-47e2-bec8-a9e600e28c4a', name: 'RONA Atlantic' },
          { id: 'org-1762782701221', name: 'Default Member Organization' },
          { id: 'org-1762782475382', name: 'George Campbell Personal Org' },
          { id: 'org-1762906532185', name: 'Larry Lee Org' },
          { id: 'org-1763260158270', name: 'Matt Brennan Org' },
          { id: 'default-org', name: 'ProSpaces CRM' }
        ];

        for (const org of requiredOrgs) {
          const { data: existing } = await supabase.from('organizations').select('id').eq('id', org.id).maybeSingle();
          if (!existing) {
            console.log(`[AUTO-HEAL] Inserting missing organization: ${org.name}`);
            await supabase.from('organizations').insert({
              id: org.id,
              name: org.name,
              status: 'active',
              ai_suggestions_enabled: org.id === '34638283-7b3d-47e2-bec8-a9e600e28c4a' || org.id === 'default-org',
              marketing_enabled: true,
              inventory_enabled: true,
              import_export_enabled: true,
              documents_enabled: true
            });
          }
        }

        // 2. Force geocam55@gmail.com into RONA Atlantic, and make of it role 'admin'
        if (inputUserEmail.toLowerCase() === 'geocam55@gmail.com' || inputUserEmail === 'geocam55@gmail.com') {
          console.log('[AUTO-HEAL] Performing geocam55 redirection to Rona Atlantic admin...');
          
          // Update Auth metadata
          await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              organizationId: '34638283-7b3d-47e2-bec8-a9e600e28c4a',
              organization_id: '34638283-7b3d-47e2-bec8-a9e600e28c4a',
              role: 'admin'
            }
          });

          // Insert/upgrade public.profiles directly bypass RLS
          const { error: upsertErr } = await supabase.from('profiles').upsert({
            id: user.id,
            email: inputUserEmail,
            name: user.user_metadata?.name || 'George Campbell',
            role: 'admin',
            organization_id: '34638283-7b3d-47e2-bec8-a9e600e28c4a',
            status: 'active',
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
          
          if (upsertErr) console.error('[AUTO-HEAL] profile upsert error:', upsertErr.message);
        }

        // 3. Re-align and import other KV users if profiles is empty/unpopulated
        const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        if (!profileCount || profileCount <= 1) {
          console.log('[AUTO-HEAL] Secondary profiles empty; fetching and migrating KV users...');
          const { data: kvData } = await supabase.from('kv_store_8405be07').select('key, value').like('key', 'user:%');
          const kvUsers = kvData?.filter((d: any) => !d.key.includes(':email:')) || [];
          for (const u of kvUsers) {
             const userObj = u.value;
             let email = userObj.email;
             let name = userObj.name || email.split('@')[0];
             let role = userObj.role || 'standard_user';
             let orgId = userObj.organizationId || 'default-org';
             if (email.endsWith('@ronaatlantic.ca')) orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';
             if (email === 'geocam55@gmail.com') {
               orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';
               role = 'admin';
             }
             await supabase.from('profiles').upsert({
               id: userObj.id,
               email: email,
               name: name,
               role: role,
               organization_id: orgId,
               status: 'active',
               created_at: userObj.createdAt || new Date().toISOString()
             }, { onConflict: 'id' });
          }
        }

        // 4. Update contact owners by linking owner_id to profiles where account_owner_number matches profile.email
        const { data: allProfiles } = await supabase.from('profiles').select('id, email');
        if (allProfiles && allProfiles.length > 0) {
          for (const p of allProfiles) {
            if (p.email) {
              await supabase
                .from('contacts')
                .update({ owner_id: p.id })
                .ilike('account_owner_number', p.email.trim());
            }
          }
        }
      } catch (autoHealError: any) {
        console.error('[AUTO-HEAL] Error during diagnosis healing:', autoHealError);
      }

      // Get user with retry after updates
      const { data: { user: updatedUser } } = await supabase.auth.getUser(accessToken);
      const activeUser = updatedUser || user;

      // Get the user's profile with auto-creation fallback
      let profile;
      try {
        profile = await getOrCreateClientProfile(supabase, activeUser);
      } catch (err: any) {
        return c.json({ error: 'Caller profile could not be verified or dynamically created: ' + err.message }, 404);
      }

      const userEmail = profile.email || activeUser.email || '';
      const profileOrgId = profile.organization_id;
      const jwtOrgId = activeUser.user_metadata?.organizationId || activeUser.user_metadata?.organization_id || null;

      console.log(`Diagnosing contacts for: ${userEmail} (${activeUser.id})`);
      console.log(`  Profile org: ${profileOrgId}, JWT org: ${jwtOrgId}`);

      // Count total contacts in the user's profile org
      const { count: totalInProfileOrg } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profileOrgId);

      // Count contacts where owner_id matches this user (in profile org)
      const { count: ownedByUUID } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profileOrgId)
        .eq('owner_id', user.id);

      // Search GLOBALLY for contacts matching this user's email in account_owner_number
      const hasAOCol = await hasAccountOwnerColumn(supabase);
      
      let globalEmailMatches: any[] = [];
      let globalEmailCount = 0;
      let allContactsInOrg: any[] = [];

      if (hasAOCol) {
        const { data: emailData, count: emailCount } = await supabase
          .from('contacts')
          .select('id, name, company, owner_id, account_owner_number, organization_id', { count: 'exact' })
          .ilike('account_owner_number', userEmail)
          .limit(20);
        globalEmailMatches = emailData || [];
        globalEmailCount = emailCount || 0;

        const { data: orgData } = await supabase
          .from('contacts')
          .select('owner_id, account_owner_number')
          .eq('organization_id', profileOrgId);
        allContactsInOrg = orgData || [];
      } else {
        console.log('[diagnose] account_owner_number column not available — skipping email-based queries');
      }

      // Count mismatches: email matches but owner_id is wrong
      let mismatchCount = 0;
      let wrongOrgCount = 0;
      (globalEmailMatches || []).forEach((c: any) => {
        if (c.owner_id !== user.id) mismatchCount++;
        if (c.organization_id !== profileOrgId) wrongOrgCount++;
      });

      // Get all unique owner_ids and account_owner_numbers in the org
      const ownerIdSet = new Set<string>();
      const accountOwnerSet = new Set<string>();
      (allContactsInOrg || []).forEach((ct: any) => {
        if (ct.owner_id) ownerIdSet.add(ct.owner_id);
        if (ct.account_owner_number) accountOwnerSet.add(ct.account_owner_number);
      });

      // Get all profiles in the org (to map emails to UUIDs)
      const { data: orgProfiles } = await supabase
        .from('profiles')
        .select('id, email, name, role')
        .eq('organization_id', profileOrgId);

      return c.json({
        success: true,
        user: {
          id: user.id,
          email: userEmail,
          role: profile.role,
          organization_id: profileOrgId,
          jwt_organization_id: jwtOrgId,
          jwt_matches_profile: jwtOrgId === profileOrgId,
        },
        stats: {
          totalContactsInOrg: totalInProfileOrg || 0,
          ownedByUserUUID: ownedByUUID || 0,
          globalEmailMatches: globalEmailCount || 0,
          mismatchedOwnership: mismatchCount,
          wrongOrganization: wrongOrgCount,
          hasAccountOwnerColumn: hasAOCol,
        },
        sampleEmailMatches: globalEmailMatches || [],
        uniqueOwnerIds: [...ownerIdSet],
        uniqueAccountOwners: [...accountOwnerSet],
        orgProfiles: orgProfiles || [],
      });
    } catch (error: any) {
      console.error('Diagnosis error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // POST: Fix contact ownership by syncing owner_id from account_owner_number
  //       and fixing organization_id + JWT metadata mismatches
  app.post('/make-server-8405be07/contacts/fix-ownership', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Authenticate the requesting user
      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized: ' + (authError?.message || 'No user') }, 401);
      }

      // Get the caller's profile with auto-creation fallback
      let callerProfile;
      try {
        callerProfile = await getOrCreateClientProfile(supabase, user);
      } catch (err: any) {
        return c.json({ error: 'Caller profile could not be verified or dynamically created: ' + err.message }, 404);
      }

      const { targetEmail, organizationId } = await c.req.json();
      const orgId = organizationId || callerProfile.organization_id;
      const emailToFix = targetEmail || callerProfile.email;

      console.log(`Fix ownership request from ${callerProfile.email} (role: ${callerProfile.role})`);
      console.log(`  Target email: ${emailToFix}, Org: ${orgId}`);

      // Step 1: Fix JWT metadata if organizationId is missing
      const jwtOrgId = user.user_metadata?.organizationId;
      let jwtFixed = false;
      if (!jwtOrgId || jwtOrgId !== orgId) {
        console.log(`Fixing JWT metadata: organizationId ${jwtOrgId} -> ${orgId}`);
        const { error: updateAuthError } = await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            organizationId: orgId,
            organization_id: orgId,
          },
        });
        if (updateAuthError) {
          console.error('Failed to update auth metadata:', updateAuthError);
        } else {
          jwtFixed = true;
          console.log('JWT metadata updated successfully');
        }
      }

      // Step 2: Get all profiles in the org (to build email->UUID mapping)
      const { data: orgProfiles } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('organization_id', orgId);

      // Build email -> UUID lookup (case-insensitive)
      const emailToUUID: Record<string, string> = {};
      (orgProfiles || []).forEach((p: any) => {
        if (p.email) {
          emailToUUID[p.email.toLowerCase()] = p.id;
        }
      });

      console.log('Email to UUID mapping:', emailToUUID);

      // Check if account_owner_number column exists before querying it
      const hasAOCol = await hasAccountOwnerColumn(supabase);
      
      if (!hasAOCol) {
        return c.json({
          success: true,
          message: 'The account_owner_number column does not exist yet. Please run the ALTER TABLE SQL in the Supabase SQL Editor first, then retry.',
          fixed: 0,
          skipped: 0,
          jwtFixed,
          columnMissing: true,
        });
      }

      // Step 3: Find ALL contacts globally where account_owner_number matches the target email
      const { data: contactsToCheck, error: fetchError } = await supabase
        .from('contacts')
        .select('id, name, owner_id, account_owner_number, organization_id')
        .ilike('account_owner_number', emailToFix);

      if (fetchError) {
        console.error('Error fetching contacts:', fetchError);
        return c.json({ error: 'Failed to fetch contacts: ' + fetchError.message }, 500);
      }

      if (!contactsToCheck || contactsToCheck.length === 0) {
        return c.json({
          success: true,
          message: `No contacts found with account_owner_number matching "${emailToFix}"`,
          fixed: 0,
          skipped: 0,
          jwtFixed,
        });
      }

      console.log(`Found ${contactsToCheck.length} contacts matching ${emailToFix}`);

      const correctUUID = emailToUUID[emailToFix.toLowerCase()] || user.id;
      let fixed = 0;
      let skipped = 0;
      let orgFixed = 0;
      const errors: string[] = [];

      // Process each contact
      for (const contact of contactsToCheck) {
        const needsOwnerFix = contact.owner_id !== correctUUID;
        const needsOrgFix = contact.organization_id !== orgId;

        if (!needsOwnerFix && !needsOrgFix) {
          skipped++;
          continue;
        }

        const updatePayload: any = {};
        if (needsOwnerFix) updatePayload.owner_id = correctUUID;
        if (needsOrgFix) updatePayload.organization_id = orgId;

        const { error: updateError } = await supabase
          .from('contacts')
          .update(updatePayload)
          .eq('id', contact.id);

        if (updateError) {
          errors.push(`Failed to update ${contact.id} (${contact.name}): ${updateError.message}`);
        } else {
          if (needsOwnerFix) fixed++;
          if (needsOrgFix) orgFixed++;
          console.log(`Fixed: ${contact.name} -> owner_id=${correctUUID}, org=${orgId}`);
        }
      }

      const message = [
        `Processed ${contactsToCheck.length} contacts matching "${emailToFix}".`,
        fixed > 0 ? `Fixed owner_id on ${fixed} contacts.` : null,
        orgFixed > 0 ? `Fixed organization_id on ${orgFixed} contacts.` : null,
        skipped > 0 ? `${skipped} already correct.` : null,
        jwtFixed ? 'Updated your auth session metadata (sign out and back in to refresh).' : null,
      ].filter(Boolean).join(' ');

      console.log(message);

      return c.json({
        success: true,
        message,
        fixed,
        orgFixed,
        skipped,
        jwtFixed,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error('Fix ownership error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // POST: Reassign contacts by email (existing functionality, now using service role)
  app.post('/make-server-8405be07/contacts/reassign-by-email', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const { fromEmail, toEmail, organizationId } = await c.req.json();

      console.log(`Reassigning contacts from ${fromEmail} to ${toEmail} in org ${organizationId}`);

      // Check if account_owner_number column exists
      const hasAOCol = await hasAccountOwnerColumn(supabase);
      if (!hasAOCol) {
        return c.json({
          error: 'The account_owner_number column does not exist yet. Please run the ALTER TABLE SQL in the Supabase SQL Editor first, then retry.',
          columnMissing: true,
        }, 400);
      }

      // Find the target user's UUID — first try within the specified org,
      // then fall back to a global email lookup in case the org ID from
      // JWT metadata is stale or doesn't match the profile's org.
      let targetProfile: any = null;

      // Attempt 1: exact org + email match
      const { data: byOrgEmail } = await supabase
        .from('profiles')
        .select('id, email, organization_id')
        .eq('organization_id', organizationId)
        .ilike('email', toEmail)
        .maybeSingle();

      if (byOrgEmail) {
        targetProfile = byOrgEmail;
        console.log(`Found target profile in specified org: ${targetProfile.id}`);
      } else {
        // Attempt 2: email-only lookup (org may differ)
        console.warn(`Profile not found in org ${organizationId}, trying global email lookup for ${toEmail}`);
        const { data: byEmail } = await supabase
          .from('profiles')
          .select('id, email, organization_id')
          .ilike('email', toEmail)
          .maybeSingle();

        if (byEmail) {
          targetProfile = byEmail;
          console.log(`Found target profile in org ${byEmail.organization_id} (different from requested ${organizationId}): ${targetProfile.id}`);
        }
      }

      if (!targetProfile) {
        // Log all profiles to help debug
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, email, organization_id')
          .limit(50);
        console.error(`User not found: ${toEmail}. All profiles:`, allProfiles?.map((p: any) => p.email));
        return c.json({ error: `User not found: ${toEmail}. Make sure this user has been invited and has signed in at least once.` }, 404);
      }

      // Use the target profile's actual organization_id for the contact update
      const effectiveOrgId = organizationId || targetProfile.organization_id;

      // Update contacts: set both account_owner_number AND owner_id
      const { data: updated, error: updateError } = await supabase
        .from('contacts')
        .update({
          account_owner_number: toEmail,
          owner_id: targetProfile.id,
        })
        .eq('organization_id', effectiveOrgId)
        .ilike('account_owner_number', fromEmail)
        .select('id');

      if (updateError) {
        console.error('Update error:', updateError);
        return c.json({ error: updateError.message }, 500);
      }

      const count = updated?.length || 0;
      console.log(`Reassigned ${count} contacts from ${fromEmail} to ${toEmail}`);

      return c.json({
        success: true,
        message: `Reassigned ${count} contacts from ${fromEmail} to ${toEmail}`,
        count,
      });
    } catch (error: any) {
      console.error('Reassign error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
}