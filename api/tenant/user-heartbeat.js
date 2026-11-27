import {
  getTenantSupabase,
  normalizeTenantId,
  deserializeFromPhone,
  serializeToPhone,
} from '../_lib/tenantHelper.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { tenantId: rawTenantId, userId, lastActive } = req.body || {};
  const timestamp = lastActive || new Date().toISOString();

  if (!rawTenantId || !userId) {
    return res.status(200).json({ success: true, timestamp });
  }

  try {
    const supabase = getTenantSupabase(req);
    const tenantId = normalizeTenantId(rawTenantId);

    const { data: userRows } = await supabase
      .from('users')
      .select('*')
      .eq('tenantId', tenantId)
      .eq('id', String(userId))
      .limit(1);

    if (Array.isArray(userRows) && userRows.length > 0) {
      const user = deserializeFromPhone(userRows[0]);
      const updatedPhone = serializeToPhone(
        user.phone,
        user.password,
        user.status,
        user.driverLicenseExpire,
        timestamp,
        user.resetRequest,
        user.avatarUrl,
        user.roles
      );
      await supabase
        .from('users')
        .update({ phone: updatedPhone })
        .eq('tenantId', tenantId)
        .eq('id', String(userId));
    }

    return res.status(200).json({ success: true, timestamp });
  } catch (err) {
    console.warn('[API /api/tenant/user-heartbeat] Notice:', err?.message || err);
    return res.status(200).json({ success: true, timestamp });
  }
}
