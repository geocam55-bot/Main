import {
  getTenantSupabase,
  normalizeTenantId,
  serializeToPhone,
  serializeToType,
  sanitizeDateForDb,
  sanitizeNumberForDb,
  upsertRowsResilient,
} from '../_lib/tenantHelper.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, supabaseActive: false, error: 'Method not allowed' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const payloadSource = body.state && typeof body.state === 'object' ? body.state : body;
  const rawTenantId = body.tenantId || payloadSource.tenantId;

  if (!rawTenantId || !String(rawTenantId).trim()) {
    return res.status(400).json({ success: false, supabaseActive: false, error: 'tenantId is required.' });
  }

  const tenantId = normalizeTenantId(rawTenantId);
  const deliveries = Array.isArray(payloadSource.deliveries) ? payloadSource.deliveries : [];
  const trucks = Array.isArray(payloadSource.trucks) ? payloadSource.trucks : [];
  const branches = Array.isArray(payloadSource.branches) ? payloadSource.branches : [];
  const users = Array.isArray(payloadSource.users) ? payloadSource.users : [];

  try {
    const supabase = getTenantSupabase(req);

    // Deduplicate collections
    const uniqueBranchesMap = new Map();
    for (const b of branches) {
      if (b && b.id) uniqueBranchesMap.set(String(b.id), b);
    }
    const uniqueBranches = Array.from(uniqueBranchesMap.values());

    const uniqueTrucksMap = new Map();
    for (const t of trucks) {
      if (t && t.id) uniqueTrucksMap.set(String(t.id), t);
    }
    const uniqueTrucks = Array.from(uniqueTrucksMap.values());

    const uniqueUsersMap = new Map();
    for (const u of users) {
      if (u && u.id) uniqueUsersMap.set(String(u.id), u);
    }
    const uniqueUsers = Array.from(uniqueUsersMap.values());

    const uniqueDeliveriesMap = new Map();
    for (const d of deliveries) {
      if (d && d.id) uniqueDeliveriesMap.set(String(d.id), d);
    }
    const uniqueDeliveries = Array.from(uniqueDeliveriesMap.values());

    // 1. Branches
    const mappedBranches = uniqueBranches.map((b) => {
      let rawAddr = String(b.address || '');
      if (rawAddr.includes('||META:')) {
        rawAddr = rawAddr.split('||META:')[0];
      }
      let addressVal = rawAddr;
      if (b.closureRules || b.deliveryBoardConfig || b.deliveryDays) {
        const meta = {
          closureRules: b.closureRules,
          deliveryBoardConfig: b.deliveryBoardConfig,
          deliveryDays: b.deliveryDays,
        };
        addressVal = `${rawAddr}||META:${JSON.stringify(meta)}`;
      }
      const bType = String(
        b.type ||
          b.branchType ||
          b.branch_type ||
          (String(b.name || b.id || '').toUpperCase().includes('DC') ? 'DC' : 'STORE')
      );
      return {
        id: String(b.id || b.code || b.branchCode || b.branch_code),
        tenantId,
        name: String(b.name || b.branchName || b.branch_name || b.id || 'Store'),
        type: bType,
        address: addressVal || 'N/A',
        latitude: typeof b.latitude === 'number' && !Number.isNaN(b.latitude) ? b.latitude : null,
        longitude: typeof b.longitude === 'number' && !Number.isNaN(b.longitude) ? b.longitude : null,
        branch_code: b.branchCode || b.branch_code || b.code || b.id,
        city: b.city || null,
        province_state: b.provinceState || b.province_state || 'NS',
        geofence_radius_meters: b.geofenceRadiusMeters || 100,
        is_active: b.isActive !== false,
      };
    });

    // 2. Trucks (preserve Supabase database authority on deleted trucks)
    let trucksToSave = uniqueTrucks;
    try {
      const { data: existingDbTrucks } = await supabase.from('trucks').select('id').eq('tenantId', tenantId);
      if (existingDbTrucks && existingDbTrucks.length > 0) {
        const existingSet = new Set(existingDbTrucks.map((t) => String(t.id).toLowerCase()));
        trucksToSave = uniqueTrucks.filter(
          (t) => existingSet.has(String(t.id).toLowerCase()) || t._isNew === true || t.isNew === true
        );
      }
    } catch {}

    const serializedTrucks = trucksToSave.map((t) => {
      const driverVal = t.driver || t.driver_name || t.assigned_driver_id || 'No Driver';
      const assignedDriverIdVal =
        t.assignedDriverId || t.assigned_driver_id || (driverVal !== 'No Driver' ? driverVal : null);
      const regDate = sanitizeDateForDb(t.registrationDueDate || t.registration_due_date || t.registrationExpiryDate);
      return {
        id: String(t.id),
        tenantId: t.tenantId || tenantId,
        name: t.name || `Truck ${t.id}`,
        type: serializeToType(t.type),
        driver: driverVal,
        assigned_driver_id: assignedDriverIdVal,
        branchId: t.branchId || t.branch_id || null,
        registrationDueDate: regDate,
        registration_expiry_date: regDate,
        truck_number: t.truckNumber || t.truck_number || null,
        vin: t.vin || null,
        license_plate: t.licensePlate || t.license_plate || null,
        make: t.make || null,
        model: t.model || null,
        year: sanitizeNumberForDb(t.year),
        color: t.color || null,
        vehicle_type: t.vehicleType || t.vehicle_type || t.type || null,
        current_mileage: sanitizeNumberForDb(t.currentMileage || t.current_mileage),
        last_service_date: sanitizeDateForDb(t.lastServiceDate || t.last_service_date),
        next_service_due_date: sanitizeDateForDb(t.nextServiceDueDate || t.next_service_due_date),
        insurance_policy_number: t.insurancePolicyNumber || t.insurance_policy_number || null,
        insurance_expiry_date: sanitizeDateForDb(t.insuranceExpiryDate || t.insurance_expiry_date),
        is_refrigerated: t.isRefrigerated ?? false,
        is_liftgate_equipped: t.isLiftgateEquipped ?? false,
      };
    });

    // 3. Users
    const serializedUsers = uniqueUsers.map((u) => {
      const cleanPhone = serializeToPhone(
        u.phone,
        u.password,
        u.status,
        u.driverLicenseExpire,
        u.lastActive,
        u.resetRequest,
        u.avatarUrl,
        u.roles
      );
      return {
        id: String(u.id),
        tenantId,
        name: String(u.name || '').trim() || 'User',
        email: String(u.email || '').trim(),
        role: String(u.role || 'User'),
        roles: u.roles || [u.role || 'User'],
        phone: cleanPhone,
        associatedStoreId: u.associatedStoreId || null,
        password: u.password || null,
        status: u.status || 'Active',
        driverLicenseExpire: u.driverLicenseExpire || null,
      };
    });

    // 4. Deliveries
    const mappedDeliveries = uniqueDeliveries.map((d) => {
      const customerEmailVal = d.customerEmail || d.customer_email || '';
      const trackingNumberVal = d.trackingNumber || d.tracking_number || '';
      const trackingTokenVal = d.trackingToken || d.tracking_token || String(d.id);
      const fullMeta = {
        ...d,
        id: String(d.id),
        tenantId,
        invoiceNumber: d.invoiceNumber || d.orderNumber || d.id || '',
        epicorSalesOrder: d.epicorSalesOrder || d.orderNumber || d.id || '',
        customerName: d.customerName || d.customer || 'N/A',
        deliveryAddress: d.deliveryAddress || d.destination || 'N/A',
        phone: d.phone || '',
        customerEmail: customerEmailVal,
        trackingNumber: trackingNumberVal,
        trackingToken: trackingTokenVal,
        originBranch: d.originBranch || 'prospaces-dc',
        status: d.status || 'REGISTERED',
        registeredAt: d.registeredAt || d.date || new Date().toISOString(),
        additionalStops: d.additionalStops || [],
        cargoManifest: d.cargoManifest || d.cargo_manifest || [],
        history: Array.isArray(d.history) ? d.history : [],
      };
      const obj = {
        id: String(d.id),
        tenantId,
        orderNumber: String(d.invoiceNumber || d.epicorSalesOrder || d.orderNumber || d.id || 'N/A'),
        customer: String(d.customerName || d.customer || 'N/A'),
        destination: String(d.deliveryAddress || d.destination || 'N/A'),
        scheduled_date: String(d.scheduledDate || d.registeredAt || d.date || new Date().toISOString()),
        assignedTruckId: String(d.assignedTruck || d.assignedTruckId || 'unassigned'),
        assignedDriverId: String(d.assignedDriver || d.assignedDriverId || 'unassigned'),
        status: String(d.status || 'REGISTERED'),
        eta: String(d.eta || 'N/A'),
        pickup_location: String(d.originBranch || 'prospaces-dc'),
        tracking_number: trackingNumberVal,
        items: [JSON.stringify({ _meta: fullMeta })],
      };
      if (customerEmailVal) obj.customer_email = customerEmailVal;
      return obj;
    });

    const [branchesRes, trucksRes, usersRes, deliveriesRes] = await Promise.all([
      upsertRowsResilient(supabase, 'branches', mappedBranches, (b) => ({
        id: b.id,
        tenantId: b.tenantId,
        name: b.name,
        type: b.type,
        address: b.address,
      })),
      upsertRowsResilient(supabase, 'trucks', serializedTrucks, (t) => ({
        id: t.id,
        tenantId: t.tenantId,
        name: t.name,
        type: t.type,
        driver: t.driver,
        branchId: t.branchId,
      })),
      upsertRowsResilient(supabase, 'users', serializedUsers, (u) => ({
        id: u.id,
        tenantId: u.tenantId,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
      })),
      upsertRowsResilient(supabase, 'deliveries', mappedDeliveries),
    ]);

    const firstError = usersRes.error || branchesRes.error || trucksRes.error || deliveriesRes.error;
    if (firstError) {
      throw new Error(firstError.message || String(firstError));
    }

    // Best-effort KV mirror (kv_store_8405be07 only has key & value columns)
    try {
      await supabase.from('kv_store_8405be07').upsert({
        key: `tenant_state_${tenantId}`,
        value: { deliveries: uniqueDeliveries, trucks: trucksToSave, branches: uniqueBranches, users: uniqueUsers },
      });
    } catch {}

    return res.status(200).json({
      success: true,
      supabaseActive: true,
      message: 'Tenant state saved to Supabase tables.',
    });
  } catch (error) {
    console.error('[API /api/tenant/save-state] Error:', error?.message || error);
    return res.status(500).json({
      success: false,
      supabaseActive: false,
      error: error?.message || 'Failed to save tenant state to Supabase.',
    });
  }
}
