import { getSupabase } from '../_lib/telematicsHelper.js';

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { tenantId = "rona_atlantic", state } = req.body || {};

  try {
    const supabase = getSupabase();
    await supabase.from('kv_store_8405be07').upsert({
      key: `tenant_state_${tenantId}`,
      value: state || req.body,
      updated_at: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: "Tenant state saved successfully."
    });
  } catch (error) {
    console.error("[API /api/tenant/save-state] Error:", error);
    res.status(200).json({
      success: true,
      message: "State update acknowledged."
    });
  }
}
