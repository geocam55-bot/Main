import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractUserToken } from './auth-helper.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export const dataMigration = (app: Hono) => {
  app.post('/data/fix', async (c) => {
    const token = extractUserToken(c);
    if (!token) {
      return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const organizationId = user.user_metadata?.organizationId;
    if (!organizationId) {
      // Try to find organization from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
        
      if (!profile?.organization_id) {
         return c.json({ error: 'No organization ID found for user. Cannot proceed with fixes.' }, 400);
      }
    }

    const report: any = {
      bids: { scanned: 0, fixed_status: 0, fixed_org: 0, fixed_owner: 0, errors: [] },
      quotes: { scanned: 0, fixed_status: 0, fixed_org: 0, fixed_owner: 0, errors: [] },
    };

    // 1. Fix Bids
    try {
      const { data: bids, error: bidsError } = await supabase.from('bids').select('*');
      
      if (bidsError) {
        report.bids.errors.push(bidsError.message);
      } else if (bids) {
        report.bids.scanned = bids.length;
        
        for (const bid of bids) {
          const updates: any = {};
          
          if (!bid.status) {
            updates.status = 'draft';
            report.bids.fixed_status++;
          }
          
          if (!bid.organization_id && organizationId) {
            updates.organization_id = organizationId; // Assign to current user's org if missing
            report.bids.fixed_org++;
          }
          
          if (!bid.created_by) {
            updates.created_by = user.id; // Assign to current user if missing
            report.bids.fixed_owner++;
          }
          
          if (Object.keys(updates).length > 0) {
            await supabase.from('bids').update(updates).eq('id', bid.id);
          }
        }
      }
    } catch (e: any) {
      report.bids.errors.push(e.message);
    }

    // 2. Fix Quotes
    try {
      const { data: quotes, error: quotesError } = await supabase.from('quotes').select('*');
      
      if (quotesError) {
         report.quotes.errors.push(quotesError.message);
      } else if (quotes) {
        report.quotes.scanned = quotes.length;
        
        for (const quote of quotes) {
          const updates: any = {};
          
          if (!quote.status) {
            updates.status = 'draft';
             report.quotes.fixed_status++;
          }
          
          if (!quote.organization_id && organizationId) {
            updates.organization_id = organizationId;
            report.quotes.fixed_org++;
          }
          
          if (!quote.created_by) {
            updates.created_by = user.id;
            report.quotes.fixed_owner++;
          }
          
          if (Object.keys(updates).length > 0) {
            await supabase.from('quotes').update(updates).eq('id', quote.id);
          }
        }
      }
    } catch (e: any) {
      report.quotes.errors.push(e.message);
    }
    
    return c.json({ success: true, report });
  });
};