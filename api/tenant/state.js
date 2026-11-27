import {
  getTenantSupabase,
  normalizeTenantId,
  deserializeFromPhone,
  deserializeType,
} from '../_lib/tenantHelper.js';

const DEFAULT_BRANCHES = [
  { id: 'rona_halifax', name: 'RONA+ Halifax (Store 7010)', address: '5500 Chain Lake Dr, Halifax, NS B3S 1H6', type: 'STORE' },
  { id: 'rona_dartmouth', name: 'RONA+ Dartmouth (Store 7020)', address: '100 Gale Terrace, Dartmouth, NS B3B 0B7', type: 'STORE' },
  { id: 'rona_bedford', name: 'RONA Bedford (Store 7030)', address: '1650 Bedford Hwy, Bedford, NS B4A 1E8', type: 'STORE' },
  { id: 'rona_bayers', name: 'RONA Bayers Lake (Store 7040)', address: '200 Chain Lake Dr, Halifax, NS B3S 1D5', type: 'STORE' },
];

const DEFAULT_TRUCKS = [
  { id: 'TRK-01', truckNumber: 'TRK-01', name: 'Unit 101 - 26ft Freightliner M2', type: '26ft Box Truck', branchId: 'rona_halifax', branch_id: 'rona_halifax', driver: 'Dave Miller', assignedDriverId: 'Dave Miller', gpsDeviceId: 'FC-TRK01', gpsStatus: 'Connected', lat: 44.6488, lng: -63.5752, gpsLat: 44.6488, gpsLng: -63.5752 },
  { id: 'TRK-02', truckNumber: 'TRK-02', name: 'Unit 102 - 24ft International MV', type: '24ft Box Truck', branchId: 'rona_halifax', branch_id: 'rona_halifax', driver: 'Sarah Jenkins', assignedDriverId: 'Sarah Jenkins', gpsDeviceId: 'FC-TRK02', gpsStatus: 'Connected', lat: 44.6510, lng: -63.5820, gpsLat: 44.6510, gpsLng: -63.5820 },
  { id: 'TRK-03', truckNumber: 'TRK-03', name: 'Unit 103 - 26ft Hino 338 Flatbed', type: 'Flatbed Boom Truck', branchId: 'rona_halifax', branch_id: 'rona_halifax', driver: 'Marc LeBlanc', assignedDriverId: 'Marc LeBlanc', gpsDeviceId: 'FC-TRK03', gpsStatus: 'Connected', lat: 44.6390, lng: -63.5910, gpsLat: 44.6390, gpsLng: -63.5910 },
  { id: 'TRK-04', truckNumber: 'TRK-04', name: 'Unit 104 - 20ft Isuzu NRR', type: '20ft Curtainsider', branchId: 'rona_halifax', branch_id: 'rona_halifax', driver: 'Alex Cormier', assignedDriverId: 'Alex Cormier', gpsDeviceId: 'FC-TRK04', gpsStatus: 'Connected', lat: 44.6550, lng: -63.5680, gpsLat: 44.6550, gpsLng: -63.5680 },
];

const DEFAULT_USERS = [
  { id: 'USR-ADMIN', name: 'George Cameron', email: 'geocam55@gmail.com', role: 'Admin', associatedStoreId: 'rona_halifax', status: 'Active' },
];

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  const tenantId = normalizeTenantId(req.query?.tenantId || 'rona_atlantic');

  try {
    const supabase = getTenantSupabase(req);

    const [rBranches, rTrucks, rUsers, rDeliveries, rGpsUnits] = await Promise.all([
      supabase.from('branches').select('*').eq('tenantId', tenantId),
      supabase.from('trucks').select('*').eq('tenantId', tenantId),
      supabase.from('users').select('*').eq('tenantId', tenantId),
      supabase.from('deliveries').select('*').eq('tenantId', tenantId),
      supabase
        .from('gps_units_setup')
        .select('*')
        .eq('tenantId', tenantId)
        .then((r) => r)
        .catch(() => ({ data: [] })),
    ]);

    if (rBranches.error || rTrucks.error || rUsers.error || rDeliveries.error) {
      const primaryError = rBranches.error || rTrucks.error || rUsers.error || rDeliveries.error;
      throw new Error(primaryError?.message || 'Failed to query Supabase tenant tables.');
    }

    let rawBranches = rBranches.data || [];
    let rawTrucks = rTrucks.data || [];
    let rawUsers = rUsers.data || [];
    const rawDeliveries = rDeliveries.data || [];

    if (rawTrucks.length === 0) {
      try {
        const fbT = await supabase.from('trucks').select('*');
        if (fbT.data && fbT.data.length > 0) rawTrucks = fbT.data;
      } catch {}
    }

    if (rawBranches.length === 0) {
      try {
        const fbB = await supabase.from('branches').select('*');
        if (fbB.data && fbB.data.length > 0) rawBranches = fbB.data;
      } catch {}
    }

    if (rawUsers.length === 0) {
      try {
        const fbU = await supabase.from('users').select('*');
        if (fbU.data && fbU.data.length > 0) rawUsers = fbU.data;
      } catch {}
    }

    // Optional KV fallback if relational tables have no records yet
    if (rawBranches.length === 0 && rawTrucks.length === 0 && rawUsers.length === 0 && rawDeliveries.length === 0) {
      try {
        const { data: kvRow } = await supabase
          .from('kv_store_8405be07')
          .select('value')
          .eq('key', `tenant_state_${tenantId}`)
          .maybeSingle();
        if (kvRow?.value) {
          return res.status(200).json({
            supabaseActive: true,
            tenantId,
            ...kvRow.value,
          });
        }
      } catch {}
    }

    const gpsUnits = rGpsUnits?.data || [];
    const gpsMap = new Map();
    for (const g of gpsUnits) {
      if (g.assignedTruckId) gpsMap.set(String(g.assignedTruckId).toLowerCase(), g);
      if (g.deviceId) gpsMap.set(String(g.deviceId).toLowerCase(), g);
    }

    const deserializedUsers = rawUsers.map((u) => deserializeFromPhone(u));
    const deserializedTrucks = rawTrucks.map((t) => {
      const dt = deserializeType(t);
      const matchedGps =
        gpsMap.get(String(t.id).toLowerCase()) ||
        (t.gps_device_id ? gpsMap.get(String(t.gps_device_id).toLowerCase()) : null);
      if (matchedGps) {
        dt.gpsDeviceId = matchedGps.deviceId || dt.gpsDeviceId;
        dt.gpsSerialNumber = matchedGps.serialNumber || matchedGps.serial_number || dt.gpsSerialNumber;
        dt.gpsDeviceName = matchedGps.deviceName || dt.gpsDeviceName;
        dt.gpsSimIccid = matchedGps.simIccid || dt.gpsSimIccid;
        dt.gpsStatus = matchedGps.status || dt.gpsStatus || 'Connected';
        dt.gpsLastHandshake = matchedGps.lastHandshake || dt.gpsLastHandshake;
        if (typeof matchedGps.lastLatitude === 'number' && !Number.isNaN(matchedGps.lastLatitude)) {
          dt.gpsLat = matchedGps.lastLatitude;
          dt.lat = matchedGps.lastLatitude;
        }
        if (typeof matchedGps.lastLongitude === 'number' && !Number.isNaN(matchedGps.lastLongitude)) {
          dt.gpsLng = matchedGps.lastLongitude;
          dt.lng = matchedGps.lastLongitude;
        }
      }
      return dt;
    });

    const deserializedBranches = rawBranches.map((b) => {
      let address = b.address || b.address1 || '';
      let closureRules = b.closureRules;
      let deliveryBoardConfig = b.deliveryBoardConfig;
      let deliveryDays = b.deliveryDays;

      if (address.includes('||META:')) {
        const parts = address.split('||META:');
        address = parts[0];
        try {
          const meta = JSON.parse(parts[1]);
          if (meta.closureRules) closureRules = meta.closureRules;
          if (meta.deliveryBoardConfig) deliveryBoardConfig = meta.deliveryBoardConfig;
          if (meta.deliveryDays) deliveryDays = meta.deliveryDays;
        } catch {}
      }

      return {
        ...b,
        id: b.id || b.branch_code || b.code,
        name: b.name || b.branch_name || b.branchName || b.id || 'Store',
        type: b.type || b.branch_type || b.branchType || 'STORE',
        branchCode: b.branch_code || b.branchCode || b.code || b.id,
        branchName: b.branch_name || b.branchName || b.name,
        address,
        closureRules,
        deliveryBoardConfig,
        deliveryDays,
      };
    });

    const enrichedDeliveries = rawDeliveries.map((d) => {
      let meta = {};
      if (Array.isArray(d.items) && d.items.length > 0) {
        try {
          const firstItem = d.items[0];
          const parsed = typeof firstItem === 'string' ? JSON.parse(firstItem) : firstItem;
          if (parsed && parsed._meta) meta = parsed._meta;
        } catch {}
      }

      return {
        ...d,
        id: d.id,
        tenantId: d.tenantId,
        invoiceNumber: d.invoiceNumber || meta.invoiceNumber || d.orderNumber || d.id,
        epicorSalesOrder: d.epicorSalesOrder || meta.epicorSalesOrder || d.orderNumber || d.id,
        customerName: d.customerName || meta.customerName || d.customer || 'N/A',
        deliveryAddress: d.deliveryAddress || meta.deliveryAddress || d.destination || 'N/A',
        phone: d.phone !== undefined ? d.phone : meta.phone !== undefined ? meta.phone : '',
        customerEmail: d.customer_email || d.customerEmail || meta.customerEmail || meta.customer_email || '',
        trackingNumber: d.tracking_number || d.trackingNumber || meta.trackingNumber || meta.tracking_number || '',
        trackingToken: d.tracking_token || d.trackingToken || meta.trackingToken || meta.tracking_token || d.id,
        originBranch: d.originBranch || meta.originBranch || d.pickup_location || 'prospaces-dc',
        weight: d.weight !== undefined && d.weight !== null && String(d.weight).trim() !== '' ? d.weight : meta.weight,
        orderTotal: d.orderTotal || meta.orderTotal,
        destinationNotes: d.destinationNotes || meta.destinationNotes,
        status: d.status || meta.status || 'REGISTERED',
        registeredAt: d.registeredAt || meta.registeredAt || d.date || d.scheduled_date || new Date().toISOString(),
        pickedAt: d.pickedAt || meta.pickedAt,
        deliveredAt: d.deliveredAt || meta.deliveredAt,
        returnedAt: d.returnedAt || meta.returnedAt,
        returnReason: d.returnReason || meta.returnReason,
        assignedTruck: d.assignedTruck || meta.assignedTruck || (d.assignedTruckId && d.assignedTruckId !== 'unassigned' ? d.assignedTruckId : undefined),
        assignedDriver: d.assignedDriver || meta.assignedDriver || (d.assignedDriverId && d.assignedDriverId !== 'unassigned' ? d.assignedDriverId : undefined),
        assignedPicker: d.assignedPicker || meta.assignedPicker,
        customerSignature: d.customerSignature || meta.customerSignature,
        deliveryPhoto: d.deliveryPhoto || meta.deliveryPhoto,
        deliveryPhotos: d.deliveryPhotos || meta.deliveryPhotos || (d.deliveryPhoto || meta.deliveryPhoto ? [d.deliveryPhoto || meta.deliveryPhoto] : undefined),
        pdfUrl: d.pdfUrl || meta.pdfUrl,
        documentType: d.documentType || meta.documentType,
        scheduledDate: d.scheduledDate || meta.scheduledDate || d.scheduled_date,
        scheduledSlot: d.scheduledSlot || meta.scheduledSlot || d.scheduled_slot,
        deliveryCategory: d.deliveryCategory || d.delivery_category || meta.deliveryCategory,
        additionalStops: d.additionalStops || d.additional_stops || meta.additionalStops || meta.additional_stops || [],
        cargoManifest: Array.isArray(d.cargoManifest) ? d.cargoManifest : meta.cargoManifest || d.cargo_manifest || [],
        history: Array.isArray(d.history) && d.history.length > 0 ? d.history : meta.history || [],
      };
    });

    return res.status(200).json({
      supabaseActive: true,
      tenantId,
      branches: deserializedBranches.length > 0 ? deserializedBranches : DEFAULT_BRANCHES,
      trucks: deserializedTrucks.length > 0 ? deserializedTrucks : DEFAULT_TRUCKS,
      users: deserializedUsers.length > 0 ? deserializedUsers : DEFAULT_USERS,
      deliveries: enrichedDeliveries,
    });
  } catch (e) {
    console.error('[API /api/tenant/state] Error:', e?.message || e);
    return res.status(500).json({
      supabaseActive: false,
      error: e?.message || 'Failed to read Supabase tenant state',
      tenantId,
    });
  }
}
