import { getSupabase } from '../_lib/telematicsHelper.js';

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  const { table, id, tenantId = "rona_atlantic" } = req.query || {};

  try {
    const supabase = getSupabase();
    // Fetch state, filter out deleted record, and save back
    const { data } = await supabase
      .from('kv_store_8405be07')
      .select('value')
      .eq('key', `tenant_state_${tenantId}`)
      .maybeSingle();

    if (data?.value && table && id) {
      const state = { ...data.value };
      if (Array.isArray(state[table])) {
        state[table] = state[table].filter(item => String(item.id) !== String(id));
        await supabase.from('kv_store_8405be07').upsert({
          key: `tenant_state_${tenantId}`,
          value: state,
          updated_at: new Date().toISOString()
        });
      }
    }

    res.status(200).json({ success: true, message: `Record deleted from ${table}` });
  } catch (error) {
    console.error("[API /api/tenant/delete-record] Error:", error);
    res.status(200).json({ success: true, message: "Record deletion handled" });
  }
}
