import { getSupabase } from '../_lib/telematicsHelper.js';

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
    // Extract tracking param from route query, search query, or URL
    let param = String(req.query.trackingNumber || req.query.num || req.query.id || "").trim();
    if (!param && req.url) {
      const urlParts = req.url.split('?')[0].split('/');
      param = decodeURIComponent(urlParts[urlParts.length - 1] || "").trim();
    }

    if (!param || param === "undefined" || param === "null") {
      return res.status(400).json({ success: false, error: "Tracking number or identifier is required." });
    }

    const cleanParam = param.toLowerCase().replace(/[^a-z0-9]/g, "");
    const supabase = getSupabase();
    let matchedRow = null;

    // 1. Direct query on deliveries table by tracking_number, id, or orderNumber
    try {
      const { data: dbMatches, error: dbErr } = await supabase
        .from("deliveries")
        .select("*")
        .or(`tracking_number.ilike.${param},id.eq.${param},orderNumber.ilike.${param}`)
        .limit(10);

      if (!dbErr && dbMatches && dbMatches.length > 0) {
        matchedRow = dbMatches[0];
      }
    } catch (err) {
      console.warn("[Vercel Tracking] Direct query error:", err);
    }

    // 2. Scan recent deliveries table if direct match didn't catch clean string
    if (!matchedRow) {
      try {
        const { data: allDeliveries } = await supabase
          .from("deliveries")
          .select("*")
          .order("id", { ascending: false })
          .limit(200);

        if (allDeliveries) {
          for (const d of allDeliveries) {
            const dId = String(d.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const dOrder = String(d.orderNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const dTrack = String(d.tracking_number || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const dEmail = String(d.customer_email || "").toLowerCase().trim();

            if (
              dTrack === cleanParam ||
              dId === cleanParam ||
              dOrder === cleanParam ||
              dEmail === param.toLowerCase() ||
              (d.tracking_number && d.tracking_number.toLowerCase() === param.toLowerCase())
            ) {
              matchedRow = d;
              break;
            }

            if (d.items && Array.isArray(d.items) && d.items.length > 0) {
              try {
                const firstItem = d.items[0];
                const parsed = typeof firstItem === "string" ? JSON.parse(firstItem) : firstItem;
                const meta = parsed?._meta || {};
                const mTrack = String(meta.trackingNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                const mInv = String(meta.invoiceNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                const mSales = String(meta.epicorSalesOrder || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                const mEmail = String(meta.customerEmail || "").toLowerCase();

                if (
                  mTrack === cleanParam ||
                  mInv === cleanParam ||
                  mSales === cleanParam ||
                  mEmail === param.toLowerCase()
                ) {
                  matchedRow = d;
                  break;
                }
              } catch (_) {}
            }
          }
        }
      } catch (scanErr) {
        console.warn("[Vercel Tracking] Scan error:", scanErr);
      }
    }

    // 3. Fallback: Search inside tenant states in kv_store_8405be07
    if (!matchedRow) {
      try {
        const { data: kvStates } = await supabase
          .from("kv_store_8405be07")
          .select("key, value")
          .like("key", "%tenant_state%");

        if (kvStates) {
          for (const row of kvStates) {
            const dels = row.value?.deliveries || row.value?.state?.deliveries || [];
            for (const d of dels) {
              const dId = String(d.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const dOrder = String(d.orderNumber || d.invoiceNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const dTrack = String(d.trackingNumber || d.tracking_number || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const dEmail = String(d.customerEmail || d.customer_email || "").toLowerCase().trim();

              if (
                dTrack === cleanParam ||
                dId === cleanParam ||
                dOrder === cleanParam ||
                dEmail === param.toLowerCase() ||
                (d.trackingNumber && d.trackingNumber.toLowerCase() === param.toLowerCase())
              ) {
                matchedRow = {
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
                };
                break;
              }
            }
            if (matchedRow) break;
          }
        }
      } catch (kvErr) {
        console.warn("[Vercel Tracking] KV search error:", kvErr);
      }
    }

    if (!matchedRow) {
      return res.status(404).json({
        success: false,
        error: `No delivery could be located matching tracking identifier "${param}". Please double-check your tracking code or invoice number.`
      });
    }

    // Extract rich metadata
    let meta = {};
    if (matchedRow.items && Array.isArray(matchedRow.items) && matchedRow.items.length > 0) {
      try {
        const itemZero = matchedRow.items[0];
        const parsed = typeof itemZero === "string" ? JSON.parse(itemZero) : itemZero;
        if (parsed?._meta) meta = parsed._meta;
      } catch (_) {}
    }

    const fallbackDigits = Math.abs(String(matchedRow.id).split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 900000 + 100000;
    const trackingNumber = matchedRow.tracking_number || meta.trackingNumber || `PSL-${fallbackDigits}`;
    const customerEmail = matchedRow.customer_email || meta.customerEmail || "";
    const customerName = matchedRow.customer || meta.customerName || "Valued Customer";
    const destination = matchedRow.destination || meta.deliveryAddress || "Standard Delivery Address";
    const originBranch = matchedRow.pickup_location || meta.originBranch || "prospaces-dc";
    const status = matchedRow.status || meta.status || "REGISTERED";
    const orderNumber = matchedRow.orderNumber || meta.invoiceNumber || meta.epicorSalesOrder || matchedRow.id;
    const scheduledDate = matchedRow.scheduled_date || meta.scheduledDate || matchedRow.registeredAt;
    const scheduledSlot = matchedRow.scheduled_slot || meta.scheduledSlot || "AM";
    const history = (matchedRow.history && Array.isArray(matchedRow.history)) ? matchedRow.history : (meta.history || []);

    // Fetch assigned truck live coordinates and status if available
    let truckTelemetry = null;
    const assignedTruckId = matchedRow.assignedTruckId || meta.assignedTruck;

    if (assignedTruckId && assignedTruckId !== "unassigned") {
      try {
        const { data: trucksData } = await supabase
          .from("trucks")
          .select("*")
          .eq("id", assignedTruckId)
          .limit(1);

        if (trucksData && trucksData.length > 0) {
          const tr = trucksData[0];
          truckTelemetry = {
            id: tr.id,
            name: tr.name,
            driver: tr.driver || "Assigned Driver",
            type: tr.type || "Delivery Vehicle",
            lat: typeof tr.lat === "number" ? tr.lat : (typeof tr.gpsLat === "number" ? tr.gpsLat : 44.6855),
            lng: typeof tr.lng === "number" ? tr.lng : (typeof tr.gpsLng === "number" ? tr.gpsLng : -63.5825),
            licensePlate: tr.license_plate || tr.licensePlate,
            speed: tr.gpsSpeed || tr.speed || 0
          };
        }
      } catch (tErr) {
        console.warn("[Vercel Tracking] Truck telemetry error:", tErr);
      }
    }

    const regTime = meta.registeredAt || matchedRow.created_at || new Date().toISOString();
    const pickTime = meta.pickedAt || null;
    const delTime = meta.deliveredAt || null;

    const journeySteps = [
      {
        key: "REGISTERED",
        title: "Order Registered",
        subtitle: "Order received and queued for staging",
        timestamp: regTime,
        isCompleted: true,
        isActive: status === "REGISTERED"
      },
      {
        key: "PROCESSING",
        title: "Processing at Warehouse",
        subtitle: "Cargo staged and verified at loading dock",
        timestamp: pickTime || (status !== "REGISTERED" ? regTime : null),
        isCompleted: status === "PICKED_AND_LOADED" || status === "IN_TRANSIT" || status === "DELIVERED",
        isActive: status === "PICKED_AND_LOADED"
      },
      {
        key: "OUT_FOR_DELIVERY",
        title: "Out for Delivery",
        subtitle: "Flatbed dispatched on route to project site",
        timestamp: (status === "IN_TRANSIT" || status === "DELIVERED") ? (pickTime || regTime) : null,
        isCompleted: status === "DELIVERED",
        isActive: status === "IN_TRANSIT" || (status === "PICKED_AND_LOADED" && !!truckTelemetry)
      },
      {
        key: "DELIVERED",
        title: "Delivered",
        subtitle: "Drop-off completed and receipt signed",
        timestamp: delTime,
        isCompleted: status === "DELIVERED",
        isActive: status === "DELIVERED"
      }
    ];

    return res.status(200).json({
      success: true,
      trackingNumber,
      delivery: {
        id: matchedRow.id,
        trackingNumber,
        customerEmail,
        customerName,
        destination,
        originBranch,
        orderNumber,
        epicorSalesOrder: meta.epicorSalesOrder || orderNumber,
        invoiceNumber: meta.invoiceNumber || orderNumber,
        status,
        registeredAt: regTime,
        scheduledDate,
        scheduledSlot,
        pickedAt: pickTime,
        deliveredAt: delTime,
        customerSignature: meta.customerSignature || matchedRow.customerSignature || null,
        deliveryPhotos: meta.deliveryPhotos || (meta.deliveryPhoto ? [meta.deliveryPhoto] : []),
        pdfUrl: meta.pdfUrl || null,
        documentType: meta.documentType || "Standard Order Delivery",
        weight: meta.weight || null,
        destinationNotes: meta.destinationNotes || null,
        history,
        journeySteps,
        truck: truckTelemetry
      }
    });
  } catch (err) {
    console.error("[Vercel Tracking] Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to retrieve tracking details." });
  }
}
