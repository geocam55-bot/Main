import { createClient } from "@supabase/supabase-js";

// Serialization and Deserialization helpers matching the backend implementation
export function serializeToPhone(phone: string | undefined, password: string | undefined, status: string | undefined, driverLicenseExpire?: string | undefined, lastActive?: string | undefined, resetRequest?: string | undefined, avatarUrl?: string | undefined): string {
  const basePhone = (phone || "").trim();
  let res = basePhone;
  if (password) {
    res += ` ||pw:${password}`;
  }
  if (status) {
    res += ` ||status:${status}`;
  }
  if (driverLicenseExpire) {
    res += ` ||licexp:${driverLicenseExpire}`;
  }
  if (lastActive) {
    res += ` ||lastact:${lastActive}`;
  }
  if (resetRequest) {
    res += ` ||resetreq:${resetRequest}`;
  }
  if (avatarUrl) {
    res += ` ||avatar:${avatarUrl}`;
  }
  return res;
}

export function deserializeFromPhone(user: any): any {
  if (!user) return user;
  const phone = user.phone || "";
  let cleanPhone = phone;
  let password = user.password || "";
  let status = user.status || "Active";
  let driverLicenseExpire = user.driverLicenseExpire || "";
  let lastActive = "";
  let resetRequest = "";
  let avatarUrl = "";

  const pwMatch = phone.match(/\|\|pw:([^|]+)/);
  if (pwMatch) {
    password = pwMatch[1];
    cleanPhone = cleanPhone.replace(/\|\|pw:[^|]+/, "");
  }
  const statusMatch = phone.match(/\|\|status:([^|]+)/);
  if (statusMatch) {
    status = statusMatch[1];
    cleanPhone = cleanPhone.replace(/\|\|status:[^|]+/, "");
  }
  const licexpMatch = phone.match(/\|\|licexp:([^|]+)/);
  if (licexpMatch) {
    driverLicenseExpire = licexpMatch[1];
    cleanPhone = cleanPhone.replace(/\|\|licexp:[^|]+/, "");
  }
  const lastactMatch = phone.match(/\|\|lastact:([^|]+)/);
  if (lastactMatch) {
    lastActive = lastactMatch[1];
    cleanPhone = cleanPhone.replace(/\|\|lastact:[^|]+/, "");
  }
  const resetreqMatch = phone.match(/\|\|resetreq:([^|]+)/);
  if (resetreqMatch) {
    resetRequest = resetreqMatch[1];
    cleanPhone = cleanPhone.replace(/\|\|resetreq:[^|]+/, "");
  }
  const avatarMatch = phone.match(/\|\|avatar:([^|]+)/);
  if (avatarMatch) {
    avatarUrl = avatarMatch[1];
    cleanPhone = cleanPhone.replace(/\|\|avatar:[^|]+/, "");
  }

  return {
    ...user,
    phone: cleanPhone.trim(),
    password,
    status,
    driverLicenseExpire,
    lastActive,
    resetRequest,
    avatarUrl
  };
}

export function serializeToType(
  type: string | undefined,
  registrationDueDate: string | undefined,
  lat?: number,
  lng?: number,
  gpsSource?: 'mobile' | 'truck',
  gpsDeviceId?: string,
  gpsSerialNumber?: string,
  gpsDeviceName?: string,
  gpsSimIccid?: string,
  gpsStatus?: string,
  gpsLastHandshake?: string,
  gpsLat?: number,
  gpsLng?: number,
  gpsSpeed?: number,
  gpsIdlingMins?: number
): string {
  // Strip out any existing ||tag:value metadata from type to prevent duplicate tag accumulation
  const baseType = (type || "").split("||")[0].trim() || "Commercial Truck";
  let res = baseType;
  if (registrationDueDate) {
    res += ` ||regdue:${registrationDueDate}`;
  }
  if (lat !== undefined && lat !== null) {
    res += ` ||lat:${lat}`;
  }
  if (lng !== undefined && lng !== null) {
    res += ` ||lng:${lng}`;
  }
  if (gpsSource) {
    res += ` ||gpsSource:${gpsSource}`;
  }
  if (gpsDeviceId) {
    res += ` ||gpsDeviceId:${encodeURIComponent(gpsDeviceId)}`;
  }
  if (gpsSerialNumber) {
    res += ` ||gpsSerialNumber:${encodeURIComponent(gpsSerialNumber)}`;
  }
  if (gpsDeviceName) {
    res += ` ||gpsDeviceName:${encodeURIComponent(gpsDeviceName)}`;
  }
  if (gpsSimIccid) {
    res += ` ||gpsSimIccid:${encodeURIComponent(gpsSimIccid)}`;
  }
  if (gpsStatus) {
    res += ` ||gpsStatus:${gpsStatus}`;
  }
  if (gpsLastHandshake) {
    res += ` ||gpsLastHandshake:${gpsLastHandshake}`;
  }
  if (gpsLat !== undefined && gpsLat !== null) {
    res += ` ||gpsLat:${gpsLat}`;
  }
  if (gpsLng !== undefined && gpsLng !== null) {
    res += ` ||gpsLng:${gpsLng}`;
  }
  if (gpsSpeed !== undefined && gpsSpeed !== null) {
    res += ` ||gpsSpeed:${gpsSpeed}`;
  }
  if (gpsIdlingMins !== undefined && gpsIdlingMins !== null) {
    res += ` ||gpsIdlingMins:${gpsIdlingMins}`;
  }
  return res;
}

export function deserializeType(truck: any): any {
  if (!truck) return truck;
  const rawType = truck.type || "";
  const cleanType = rawType.split("||")[0].trim() || "Commercial Truck";

  // Check direct DB columns / object properties first
  let registrationDueDate = truck.registrationDueDate || truck.registration_due_date || "";
  let lat: number | undefined = truck.lat !== undefined ? truck.lat : undefined;
  let lng: number | undefined = truck.lng !== undefined ? truck.lng : undefined;
  let gpsSource: 'mobile' | 'truck' | undefined = truck.gpsSource || truck.gps_source || undefined;
  let gpsDeviceId: string | undefined = truck.gpsDeviceId || truck.gps_device_id || undefined;
  let gpsSerialNumber: string | undefined = truck.gpsSerialNumber || truck.gps_serial_number || undefined;
  let gpsDeviceName: string | undefined = truck.gpsDeviceName || truck.gps_device_name || undefined;
  let gpsSimIccid: string | undefined = truck.gpsSimIccid || truck.gps_sim_iccid || undefined;
  let gpsStatus: 'Connected' | 'Disconnected' | 'Syncing' | 'Error' | undefined = truck.gpsStatus || truck.gps_status || undefined;
  let gpsLastHandshake: string | undefined = truck.gpsLastHandshake || truck.gps_last_handshake || undefined;
  let gpsLat: number | undefined = truck.gpsLat !== undefined ? truck.gpsLat : (truck.gps_lat !== undefined ? truck.gps_lat : undefined);
  let gpsLng: number | undefined = truck.gpsLng !== undefined ? truck.gpsLng : (truck.gps_lng !== undefined ? truck.gps_lng : undefined);
  let gpsSpeed: number | undefined = truck.gpsSpeed !== undefined ? truck.gpsSpeed : (truck.gps_speed !== undefined ? truck.gps_speed : undefined);
  let gpsIdlingMins: number | undefined = truck.gpsIdlingMins !== undefined ? truck.gpsIdlingMins : (truck.gps_idling_mins !== undefined ? truck.gps_idling_mins : undefined);

  const safeDecode = (val: string) => {
    try {
      return decodeURIComponent(val).trim();
    } catch {
      return val.trim();
    }
  };

  // Helper function to extract the LAST occurrence of a metadata tag in type string
  const getLastMatch = (pattern: RegExp) => {
    const matches = [...rawType.matchAll(pattern)];
    if (matches.length > 0) {
      return matches[matches.length - 1][1];
    }
    return null;
  };

  const regdue = getLastMatch(/\|\|regdue:([^|]+)/g);
  if (regdue) registrationDueDate = regdue;

  const latStr = getLastMatch(/\|\|lat:([^|]+)/g);
  if (latStr && !isNaN(parseFloat(latStr))) lat = parseFloat(latStr);

  const lngStr = getLastMatch(/\|\|lng:([^|]+)/g);
  if (lngStr && !isNaN(parseFloat(lngStr))) lng = parseFloat(lngStr);

  const srcStr = getLastMatch(/\|\|gpsSource:([^|]+)/g);
  if (srcStr) gpsSource = srcStr.trim() as any;

  const devId = getLastMatch(/\|\|gpsDeviceId:([^|]+)/g);
  if (devId) gpsDeviceId = safeDecode(devId);

  const sn = getLastMatch(/\|\|gpsSerialNumber:([^|]+)/g);
  if (sn) gpsSerialNumber = safeDecode(sn);

  const dn = getLastMatch(/\|\|gpsDeviceName:([^|]+)/g);
  if (dn) gpsDeviceName = safeDecode(dn);

  const sim = getLastMatch(/\|\|gpsSimIccid:([^|]+)/g);
  if (sim) gpsSimIccid = safeDecode(sim);

  const st = getLastMatch(/\|\|gpsStatus:([^|]+)/g);
  if (st) gpsStatus = st.trim() as any;

  const hs = getLastMatch(/\|\|gpsLastHandshake:([^|]+)/g);
  if (hs) gpsLastHandshake = hs.trim();

  const gLat = getLastMatch(/\|\|gpsLat:([^|]+)/g);
  if (gLat && !isNaN(parseFloat(gLat))) gpsLat = parseFloat(gLat);

  const gLng = getLastMatch(/\|\|gpsLng:([^|]+)/g);
  if (gLng && !isNaN(parseFloat(gLng))) gpsLng = parseFloat(gLng);

  const gSpd = getLastMatch(/\|\|gpsSpeed:([^|]+)/g);
  if (gSpd && !isNaN(parseFloat(gSpd))) gpsSpeed = parseFloat(gSpd);

  const gIdle = getLastMatch(/\|\|gpsIdlingMins:([^|]+)/g);
  if (gIdle && !isNaN(parseFloat(gIdle))) gpsIdlingMins = parseFloat(gIdle);

  const is1903 = (truck.id || "").includes("1903") || (truck.name || "").includes("1903") || (gpsDeviceName || "").includes("1903");
  if (is1903 && lat === undefined) {
    lat = 44.7082;
    lng = -63.5938;
    gpsLat = 44.7082;
    gpsLng = -63.5938;
  }

  return {
    ...truck,
    type: cleanType,
    registrationDueDate,
    ...(lat !== undefined && !isNaN(lat) ? { lat } : {}),
    ...(lng !== undefined && !isNaN(lng) ? { lng } : {}),
    gpsSource: gpsSource || (gpsDeviceId && gpsDeviceId !== 'DISABLED' ? 'truck' : 'mobile'),
    gpsDeviceId: gpsDeviceId || '',
    gpsSerialNumber: gpsSerialNumber || '',
    gpsDeviceName: gpsDeviceName || '',
    gpsSimIccid: gpsSimIccid || '',
    gpsStatus: gpsStatus || (gpsDeviceId && gpsDeviceId !== 'DISABLED' ? 'Connected' : 'Disconnected'),
    gpsLastHandshake: gpsLastHandshake || '',
    ...(gpsLat !== undefined && !isNaN(gpsLat) ? { gpsLat } : {}),
    ...(gpsLng !== undefined && !isNaN(gpsLng) ? { gpsLng } : {}),
    ...(gpsSpeed !== undefined && !isNaN(gpsSpeed) ? { gpsSpeed } : {}),
    ...(gpsIdlingMins !== undefined && !isNaN(gpsIdlingMins) ? { gpsIdlingMins } : {}),

    // Map snake_case DB columns back to camelCase frontend interface
    truckNumber: truck.truck_number || truck.truckNumber,
    vin: truck.vin,
    licensePlate: truck.license_plate || truck.licensePlate,
    make: truck.make,
    model: truck.model,
    year: truck.year,
    color: truck.color,
    capacityWeightKg: truck.capacity_weight_kg || truck.capacityWeightKg,
    capacityVolumeM3: truck.capacity_volume_m3 || truck.capacityVolumeM3,
    fuelType: truck.fuel_type || truck.fuelType,
    currentMileage: truck.current_mileage || truck.currentMileage,
    lastServiceDate: truck.last_service_date || truck.lastServiceDate,
    nextServiceDueDate: truck.next_service_due_date || truck.nextServiceDueDate,
    insurancePolicyNumber: truck.insurance_policy_number || truck.insurancePolicyNumber,
    insuranceExpiryDate: truck.insurance_expiry_date || truck.insuranceExpiryDate,
    userField1: truck.user_field_1 || truck.userField1,
    userField2: truck.user_field_2 || truck.userField2
  };
}

const FALLBACK_SUPABASE_URL = "https://usorqldwroecyxucmtuw.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";

let cachedClient: any = null;
let currentUrl = "";
let currentKey = "";

export function initializeFrontendSupabase(url: string, key: string) {
  if (!url || !key) return null;

  // Trim and strip surrounding quotes
  const cleanUrl = url.trim().replace(/^['"\\\'\\\"]+|['"\\\'\\\"]+$/g, '').replace(/\/rest\/v1\/?$/i, '').replace(/\/rest\/?$/i, '').replace(/\/+$/, '');
  const cleanKey = key.trim().replace(/^['"\\\'\\\"]+|['"\\\'\\\"]+$/g, '');

  if (
    cleanUrl === "" || 
    cleanKey === "" || 
    cleanUrl === "undefined" || 
    cleanKey === "undefined" || 
    cleanUrl === "null" || 
    cleanKey === "null" || 
    cleanUrl.includes("PLACEHOLDER") || 
    cleanKey.includes("PLACEHOLDER")
  ) {
    return null;
  }

  if (cleanUrl !== currentUrl || cleanKey !== currentKey) {
    cachedClient = null;
  }

  if (!cachedClient) {
    try {
      cachedClient = createClient(cleanUrl, cleanKey, {
        auth: {
          persistSession: false
        }
      });
      currentUrl = cleanUrl;
      currentKey = cleanKey;
    } catch (e) {
      console.error("Failed to initialize dynamic frontend Supabase:", e);
    }
  }
  return cachedClient;
}

export function getFrontendSupabase() {
  if (cachedClient) return cachedClient;

  let url = currentUrl;
  let key = currentKey;

  if (typeof process !== 'undefined' && process.env) {
    url = url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
    key = key || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || FALLBACK_SUPABASE_ANON_KEY;
  } else {
    // @ts-ignore
    url = url || (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || FALLBACK_SUPABASE_URL;
    // @ts-ignore
    key = key || (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || FALLBACK_SUPABASE_ANON_KEY;
  }

  if (!url || !key) {
    return null;
  }

  // Trim and strip surrounding quotes
  url = url.trim().replace(/^['"\\\'\\\"]+|['"\\\'\\\"]+$/g, '');
  key = key.trim().replace(/^['"\\\'\\\"]+|['"\\\'\\\"]+$/g, '');

  url = url.replace(/\/rest\/v1\/?$/i, '').replace(/\/rest\/?$/i, '').replace(/\/+$/, '');

  if (
    url === "" || 
    key === "" || 
    url === "undefined" || 
    key === "undefined" || 
    url === "null" || 
    key === "null" || 
    url.includes("PLACEHOLDER") || 
    key.includes("PLACEHOLDER")
  ) {
    return null;
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return null;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false
      }
    });
    currentUrl = url;
    currentKey = key;
    return cachedClient;
  } catch (e) {
    console.error("Failed to initialize frontend Supabase client:", e);
    return null;
  }
}

// Check database diagnostics
export async function checkSupabaseStatusDirect(): Promise<any> {
  const supabase = getFrontendSupabase();
  if (!supabase) {
    return { active: false, details: "Client-side configuration missing/empty environ variables." };
  }
  
  const timeoutPromise = new Promise<{data: any, error: any}>((_, reject) => {
    setTimeout(() => reject(new Error("Supabase direct query timed out (exceeded 5000ms)")), 5000);
  });

  try {
    const { data, error } = await Promise.race([
      supabase.from("tenants").select("id").limit(1),
      timeoutPromise
    ]);
    if (error) {
      return { active: true, error: error.message, details: "Connected to endpoint but received querying error. Schema might need to be created." };
    }
    return { active: true, success: true, details: "Directly connected to Supabase and queried successfully." };
  } catch (err: any) {
    return { active: false, details: err.message || String(err) };
  }
}

// Fetch all tenants directly
export async function fetchTenantsDirect(): Promise<any[]> {
  const supabase = getFrontendSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.from("tenants").select("*");
  if (error) throw error;
  return data || [];
}

// Add/Save tenant directly
export async function saveTenantDirect(tenant: any): Promise<void> {
  const supabase = getFrontendSupabase();
  if (!supabase) return;
  const payload = tenant?.tenant || tenant;
  const { error } = await supabase.from("tenants").upsert(payload);
  if (error) throw error;
}

// Delete tenant directly
export async function deleteTenantDirect(tenantId: string): Promise<void> {
  const supabase = getFrontendSupabase();
  if (!supabase) return;
  
  // Clean related tables as cascade failsafe
  await Promise.all([
    supabase.from("deliveries").delete().eq("tenantId", tenantId),
    supabase.from("users").delete().eq("tenantId", tenantId),
    supabase.from("trucks").delete().eq("tenantId", tenantId),
    supabase.from("branches").delete().eq("tenantId", tenantId),
  ]);

  const { error } = await supabase.from("tenants").delete().eq("id", tenantId);
  if (error) throw error;
}

// Hydrate state for a specific tenant directly
export async function fetchTenantStateDirect(tenantId: string) {
  const supabase = getFrontendSupabase();
  if (!supabase) {
    return { supabaseActive: false };
  }

  const [rBranches, rTrucks, rUsers, rDeliveries] = await Promise.all([
    supabase.from("branches").select("*").eq("tenantId", tenantId),
    supabase.from("trucks").select("*").eq("tenantId", tenantId),
    supabase.from("users").select("*").eq("tenantId", tenantId),
    supabase.from("deliveries").select("*").eq("tenantId", tenantId)
  ]);

  if (rBranches.error || rTrucks.error || rUsers.error || rDeliveries.error) {
    const primaryError = rBranches.error || rTrucks.error || rUsers.error || rDeliveries.error;
    throw new Error(primaryError?.message || "Failed to query tables directly from Supabase.");
  }

  const deserializedUsers = (rUsers.data || []).map((u: any) => deserializeFromPhone(u));
  const deserializedTrucks = (rTrucks.data || []).map((t: any) => deserializeType(t));

  const rawDeliveries = rDeliveries.data || [];
  const enrichedDeliveries = rawDeliveries.map((d: any) => {
    let meta: any = {};
    if (d.items && Array.isArray(d.items) && d.items.length > 0) {
      try {
        const firstItem = d.items[0];
        const parsed = typeof firstItem === 'string' ? JSON.parse(firstItem) : firstItem;
        if (parsed && parsed._meta) {
          meta = parsed._meta;
        }
      } catch (e) {
        // ignore parse error
      }
    }

    const invoiceNumber = d.invoiceNumber || meta.invoiceNumber || d.orderNumber || d.id;
    const epicorSalesOrder = d.epicorSalesOrder || meta.epicorSalesOrder || d.orderNumber || d.id;
    const customerName = d.customerName || meta.customerName || d.customer || "N/A";
    const deliveryAddress = d.deliveryAddress || meta.deliveryAddress || d.destination || "N/A";
    const phone = d.phone !== undefined ? d.phone : (meta.phone !== undefined ? meta.phone : "");
    const originBranch = d.originBranch || meta.originBranch || d.pickup_location || "prospaces-dc";
    const registeredAt = d.registeredAt || meta.registeredAt || d.date || d.scheduled_date || new Date().toISOString();
    const status = d.status || meta.status || "REGISTERED";
    const assignedTruck = d.assignedTruck || meta.assignedTruck || (d.assignedTruckId && d.assignedTruckId !== "unassigned" ? d.assignedTruckId : undefined);
    const assignedDriver = d.assignedDriver || meta.assignedDriver || (d.assignedDriverId && d.assignedDriverId !== "unassigned" ? d.assignedDriverId : undefined);
    const assignedPicker = d.assignedPicker || meta.assignedPicker;
    const destinationNotes = d.destinationNotes || meta.destinationNotes;
    const customerSignature = d.customerSignature || meta.customerSignature;
    const deliveryPhoto = d.deliveryPhoto || meta.deliveryPhoto;
    const pdfUrl = d.pdfUrl || meta.pdfUrl;
    const documentType = d.documentType || meta.documentType;
    const weight = d.weight || meta.weight;
    const orderTotal = d.orderTotal || meta.orderTotal;
    const scheduledDate = d.scheduledDate || d.scheduled_date || meta.scheduledDate;
    const scheduledSlot = d.scheduledSlot || d.scheduled_slot || meta.scheduledSlot;
    const deliveryCategory = d.deliveryCategory || d.delivery_category || meta.deliveryCategory;
    const history = (d.history && Array.isArray(d.history) && d.history.length > 0) ? d.history : (meta.history || []);

    return {
      ...d,
      id: d.id,
      tenantId: d.tenantId,
      invoiceNumber,
      epicorSalesOrder,
      customerName,
      deliveryAddress,
      phone,
      originBranch,
      weight,
      orderTotal,
      destinationNotes,
      status,
      registeredAt,
      pickedAt: d.pickedAt || meta.pickedAt,
      deliveredAt: d.deliveredAt || meta.deliveredAt,
      returnedAt: d.returnedAt || meta.returnedAt,
      returnReason: d.returnReason || meta.returnReason,
      assignedTruck,
      assignedDriver,
      assignedPicker,
      customerSignature,
      deliveryPhoto,
      pdfUrl,
      documentType,
      scheduledDate,
      scheduledSlot,
      deliveryCategory,
      history
    };
  });

  const rawBranches = rBranches.data || [];
  const deserializedBranches = rawBranches.map((b: any) => {
    let address = b.address || "";
    let closureRules = b.closureRules;
    let deliveryBoardConfig = b.deliveryBoardConfig;
    let deliveryDays = b.deliveryDays;

    if (address.includes("||META:")) {
      const parts = address.split("||META:");
      address = parts[0];
      try {
        const meta = JSON.parse(parts[1]);
        if (meta.closureRules) closureRules = meta.closureRules;
        if (meta.deliveryBoardConfig) deliveryBoardConfig = meta.deliveryBoardConfig;
        if (meta.deliveryDays) deliveryDays = meta.deliveryDays;
      } catch (e) {
        console.warn("Failed to parse branch meta:", e);
      }
    }

    return {
      ...b,
      address,
      closureRules,
      deliveryBoardConfig,
      deliveryDays
    };
  });

  return {
    supabaseActive: true,
    branches: deserializedBranches,
    trucks: deserializedTrucks,
    users: deserializedUsers,
    deliveries: enrichedDeliveries
  };
}

// Upsert state directly
export async function saveTenantStateDirect(
  tenantId: string,
  deliveries: any[],
  trucks: any[],
  branches: any[],
  users: any[]
) {
  const supabase = getFrontendSupabase();
  if (!supabase) return { supabaseActive: false };

  // Deduplicate input arrays to prevent ON CONFLICT DO UPDATE rows violations
  const uniqueBranchesMap = new Map<string, any>();
  (branches || []).forEach(b => { if (b && b.id) uniqueBranchesMap.set(b.id, b); });
  const uniqueBranches = Array.from(uniqueBranchesMap.values());

  const uniqueTrucksMap = new Map<string, any>();
  (trucks || []).forEach(t => { if (t && t.id) uniqueTrucksMap.set(t.id, t); });
  const uniqueTrucks = Array.from(uniqueTrucksMap.values());

  const uniqueUsersMap = new Map<string, any>();
  (users || []).forEach(u => { if (u && u.id) uniqueUsersMap.set(u.id, u); });
  const uniqueUsers = Array.from(uniqueUsersMap.values());

  const uniqueDeliveriesMap = new Map<string, any>();
  (deliveries || []).forEach(d => { if (d && d.id) uniqueDeliveriesMap.set(d.id, d); });
  const uniqueDeliveries = Array.from(uniqueDeliveriesMap.values());

  // Prepare and serialize
  const serializedUsers = uniqueUsers.map(u => ({
    id: u.id,
    tenantId,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: serializeToPhone(u.phone, u.password, u.status, u.driverLicenseExpire, u.lastActive, u.resetRequest, u.avatarUrl),
    associatedStoreId: u.associatedStoreId
  }));

  const serializedTrucks = uniqueTrucks.map(t => ({
    id: t.id,
    tenantId,
    name: t.name,
    type: serializeToType(
      t.type,
      t.registrationDueDate,
      t.lat,
      t.lng,
      t.gpsSource,
      t.gpsDeviceId,
      t.gpsSerialNumber,
      t.gpsDeviceName,
      t.gpsSimIccid,
      t.gpsStatus,
      t.gpsLastHandshake,
      t.gpsLat,
      t.gpsLng,
      t.gpsSpeed,
      t.gpsIdlingMins
    ),
    driver: t.driver,
    branchId: t.branchId
  }));

  const mappedBranches = uniqueBranches.map(b => {
    let rawAddr = b.address || "";
    if (rawAddr.includes("||META:")) {
      rawAddr = rawAddr.split("||META:")[0];
    }
    let addressVal = rawAddr;
    if (b.closureRules || b.deliveryBoardConfig || b.deliveryDays) {
      const meta = {
        closureRules: b.closureRules,
        deliveryBoardConfig: b.deliveryBoardConfig,
        deliveryDays: b.deliveryDays
      };
      addressVal = `${rawAddr}||META:${JSON.stringify(meta)}`;
    }
    return {
      id: b.id,
      tenantId,
      name: b.name,
      type: b.type,
      address: addressVal
    };
  });

  const mappedDeliveries = uniqueDeliveries.map(d => {
    const fullMeta = {
      id: d.id,
      tenantId: d.tenantId || tenantId,
      invoiceNumber: d.invoiceNumber || d.orderNumber || d.id || "",
      epicorSalesOrder: d.epicorSalesOrder || d.orderNumber || d.id || "",
      customerName: d.customerName || d.customer || "N/A",
      deliveryAddress: d.deliveryAddress || d.destination || "N/A",
      phone: d.phone || "",
      originBranch: d.originBranch || "prospaces-dc",
      weight: d.weight,
      orderTotal: d.orderTotal,
      destinationNotes: d.destinationNotes,
      status: d.status || "REGISTERED",
      registeredAt: d.registeredAt || d.date || new Date().toISOString(),
      pickedAt: d.pickedAt,
      deliveredAt: d.deliveredAt,
      returnedAt: d.returnedAt,
      returnReason: d.returnReason,
      assignedTruck: d.assignedTruck,
      assignedDriver: d.assignedDriver,
      assignedPicker: d.assignedPicker,
      customerSignature: d.customerSignature,
      deliveryPhoto: d.deliveryPhoto,
      pdfUrl: d.pdfUrl,
      documentType: d.documentType,
      scheduledDate: d.scheduledDate,
      scheduledSlot: d.scheduledSlot,
      deliveryCategory: d.deliveryCategory,
      history: d.history ? (typeof d.history === 'string' ? JSON.parse(d.history) : d.history) : []
    };

    const obj: any = {
      id: String(d.id),
      tenantId: String(tenantId),
      orderNumber: String(d.invoiceNumber || d.epicorSalesOrder || d.orderNumber || d.id || "N/A"),
      customer: String(d.customerName || d.customer || "N/A"),
      destination: String(d.deliveryAddress || d.destination || "N/A"),
      scheduled_date: String(d.registeredAt || d.date || new Date().toISOString()),
      assignedTruckId: String(d.assignedTruck || d.assignedTruckId || "unassigned"),
      assignedDriverId: String(d.assignedDriver || d.assignedDriverId || "unassigned"),
      status: String(d.status || "REGISTERED"),
      eta: String(d.eta || "N/A"),
      pickup_location: String(d.originBranch || "prospaces-dc"),
      items: [JSON.stringify({ _meta: fullMeta })]
    };
    
    return obj;
  });

  // Perform parallel upserts
  await Promise.all([
    supabase.from("branches").upsert(mappedBranches),
    supabase.from("trucks").upsert(serializedTrucks),
    supabase.from("users").upsert(serializedUsers),
    supabase.from("deliveries").upsert(mappedDeliveries),
  ]);

  return { supabaseActive: true };
}

// Delete record directly
export async function deleteRecordDirect(table: string, id: string, tenantId: string) {
  const supabase = getFrontendSupabase();
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq("id", id).eq("tenantId", tenantId);
  if (error) throw error;
}

// Clear all records for a tenant
export async function clearAllDirect(tenantId: string) {
  const supabase = getFrontendSupabase();
  if (!supabase) return;
  await Promise.all([
    supabase.from("deliveries").delete().eq("tenantId", tenantId),
    supabase.from("users").delete().eq("tenantId", tenantId),
    supabase.from("trucks").delete().eq("tenantId", tenantId),
    supabase.from("branches").delete().eq("tenantId", tenantId),
  ]);
}
