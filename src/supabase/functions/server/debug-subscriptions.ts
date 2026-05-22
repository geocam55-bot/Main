
import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const PREFIX = '/make-server-8405be07';

export function debugSubscriptions(app: Hono) {
  app.get(`${PREFIX}/debug-subscriptions`, async (c) => {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const logs: string[] = [];
    const log = (msg: any) => logs.push(typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2));

    log('--- DEBUG START ---');

    // 1. List Organizations
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name');

    if (orgError) {
      log(`Error fetching organizations: ${orgError.message}`);
    } else {
      log(`Found ${orgs?.length} organizations`);
      orgs?.forEach(o => log(`Org: ${o.name} (ID: ${o.id})`));
    }

    // 2. List KV Subscriptions
    try {
      // Use kv.getByPrefix to get all keys starting with "subscription:"
      // Note: kv.getByPrefix returns values, not keys+values directly, unless modified.
      // Based on kv_store.tsx, it returns T[].
      // To see keys, we might need a different approach if getByPrefix only returns values.
      // But assuming the value contains the org_id, we can deduce it.
      const subscriptions: any[] = await kv.getByPrefix('subscription:');
      log(`Found ${subscriptions.length} KV subscription records`);
      subscriptions.forEach((sub: any) => {
          log(`Subscription Record -> OrgID: ${sub.organization_id}, Plan: ${sub.plan_id}, Status: ${sub.status}`);
      });
    } catch (kvError: any) {
      log(`Error fetching KV subscriptions: ${kvError.message}`);
    }

    // 3. List Profiles for RONA Atlantic
    if (orgs) {
      for (const org of orgs) {
        if ((org.name && org.name.includes('RONA')) || (org.id && org.id.includes('RONA'))) {
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, organization_id')
            .eq('organization_id', org.id);
          
          log(`Profiles for org "${org.name}" (ID: ${org.id}): ${profiles?.length}`);
          profiles?.forEach(p => log(`Profile: ${p.email} (OrgID: ${p.organization_id})`));
        }
      }
    }

    log('--- DEBUG END ---');
    return c.json({ logs });
  });
}
