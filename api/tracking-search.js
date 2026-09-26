import { getSupabase } from './_lib/telematicsHelper.js';

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const q = String(req.query.q || req.query.query || "").trim().toLowerCase();
    if (!q) {
      return res.status(200).json({ success: true, results: [] });
    }

    const cleanQ = q.replace(/[^a-z0-9]/g, "");
    const supabase = getSupabase();
    let dbDeliveries = [];

    try {
      const { data } = await supabase
        .from("deliveries")
        .select("*")
        .order("id", { ascending: false })
        .limit(100);
      dbDeliveries = data || [];
    } catch (err) {
      console.warn("[Vercel Tracking Search] Deliveries query error:", err);
    }

    // Also scan tenant states in kv_store
    try {
      const { data: kvStates } = await supabase
        .from("kv_store_8405be07")
        .select("key, value")
        .like("key", "%tenant_state%");

      if (kvStates) {
        for (const row of kvStates) {
          const dels = row.value?.deliveries || row.value?.state?.deliveries || [];
          for (const d of dels) {
            if (!dbDeliveries.some(existing => existing.id === d.id)) {
              dbDeliveries.push({
                id: d.id,
                tenantId: d.tenantId || row.key.replace("tenant_state_", ""),
                orderNumber: d.invoiceNumber || d.orderNumber || d.id,
                customer: d.customerName || d.customer || "Valued Customer",
                destination: d.deliveryAddress || d.destination || "Standard Delivery Address",
                assignedTruckId: d.assignedTruck || d.assignedTruckId,
                assignedDriverId: d.assignedDriver || d.assignedDriverId,
                status: d.status || "REGISTERED",
                tracking_number: d.trackingNumber || d.tracking_number,
                customer_email: d.customerEmail || d.customer_email,
                items: d.items || [{ _meta: d }],
                pickup_location: d.originBranch || "RONA-03510",
                scheduled_date: d.scheduledDate,
                scheduled_slot: d.scheduledSlot
              });
            }
          }
        }
      }
    } catch (kvErr) {
      console.warn("[Vercel Tracking Search] KV error:", kvErr);
    }

    const matches = [];

    for (const d of dbDeliveries) {
      let meta = {};
      if (d.items && Array.isArray(d.items) && d.items.length > 0) {
        try {
          const parsed = typeof d.items[0] === "string" ? JSON.parse(d.items[0]) : d.items[0];
          if (parsed?._meta) meta = parsed._meta;
        } catch (_) {}
      }

      const fallbackDigits = Math.abs(String(d.id).split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 900000 + 100000;
      const trackingNumber = d.tracking_number || meta.trackingNumber || `PSL-${fallbackDigits}`;
      const customerEmail = d.customer_email || meta.customerEmail || "";
      const orderNumber = d.orderNumber || meta.invoiceNumber || meta.epicorSalesOrder || d.id;
      const customerName = d.customer || meta.customerName || "Valued Customer";
      const cleanTrack = trackingNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanId = String(d.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanOrder = String(orderNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      if (
        cleanTrack.includes(cleanQ) ||
        cleanId.includes(cleanQ) ||
        cleanOrder.includes(cleanQ) ||
        customerEmail.toLowerCase().includes(q) ||
        customerName.toLowerCase().includes(q)
      ) {
        matches.push({
          id: d.id,
          trackingNumber,
          customerName,
          orderNumber,
          status: d.status || meta.status || "REGISTERED",
          destination: d.destination || meta.deliveryAddress || "Standard Delivery Address",
          scheduledDate: d.scheduled_date || meta.scheduledDate || null
        });
      }
    }

    return res.status(200).json({ success: true, results: matches.slice(0, 10) });
  } catch (err) {
    console.error("[Vercel Tracking Search] Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to search tracking records." });
  }
}
