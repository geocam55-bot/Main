import { getTenantSupabase, normalizeTenantId } from '../_lib/tenantHelper.js';

const ALLOWED_TABLES = new Set(['users', 'branches', 'trucks', 'deliveries']);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const table = String(req.query?.table || req.body?.table || '').trim();
  const id = String(req.query?.id || req.body?.id || '').trim();
  const rawTenantId = req.query?.tenantId || req.body?.tenantId || 'rona_atlantic';
  const tenantId = normalizeTenantId(rawTenantId);

  if (!ALLOWED_TABLES.has(table) || !id) {
    return res.status(400).json({ success: false, error: 'Valid table and id parameters are required.' });
  }

  try {
    const supabase = getTenantSupabase(req);

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('tenantId', tenantId)
      .eq('id', id);

    if (error) {
      throw new Error(error.message || String(error));
    }

    if (table === 'trucks') {
      try {
        await supabase.from('gps_units_setup').delete().eq('assignedTruckId', id).eq('tenantId', tenantId);
      } catch {}
    }

    // Best-effort KV mirror cleanup
    try {
      const { data } = await supabase
        .from('kv_store_8405be07')
        .select('value')
        .eq('key', `tenant_state_${tenantId}`)
        .maybeSingle();

      if (data?.value && Array.isArray(data.value[table])) {
        const state = {
          ...data.value,
          [table]: data.value[table].filter((item) => String(item?.id) !== id),
        };
        await supabase.from('kv_store_8405be07').upsert({
          key: `tenant_state_${tenantId}`,
          value: state,
        });
      }
    } catch {}

    return res.status(200).json({ success: true, supabaseActive: true, message: `Record deleted from ${table}` });
  } catch (error) {
    console.error('[API /api/tenant/delete-record] Error:', error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to delete record' });
  }
}
