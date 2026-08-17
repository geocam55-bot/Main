import { createClient } from "@supabase/supabase-js";
import { extractVehicleNumber, sanitizeGpsCoordinates } from "./mapHelpers";

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

export function normalizeTenantId(rawTenantId: any): string {
  if (!rawTenantId) return "rona_atlantic";
  const tid = String(rawTenantId).trim();
  if (["prospaces", "prospaces-dev", "prospaces-prod", "agfydicwfv8u0rqr5apc", "default", "undefined", "null"].includes(tid.toLowerCase())) {
    return "rona_atlantic";
  }
  return tid;
}

export function serializeToType(
  type: string | undefined,
  _registrationDueDate?: string | undefined,
  _imageUrl?: string
): string {
  if (!type) return "Commercial Truck";
  const clean = String(type).split("||")[0].trim();
  return clean || "Commercial Truck";
}

export function sanitizeDateForDb(val: any): string | null {
  if (!val || typeof val !== 'string' || val.trim() === '') return null;
  const str = val.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().substring(0, 10);
  }
  return null;
}

export function sanitizeNumberForDb(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? null : num;
}

export function deserializeType(truck: any): any {
  if (!truck) return truck;
  const rawType = truck.type || "";
  const cleanType = rawType.split("||")[0].trim() || "Commercial Truck";

  // Check direct DB columns / object properties first
  let registrationDueDate = truck.registrationDueDate || truck.registration_due_date || truck.registrationExpiryDate || truck.registration_expiry_date || "";
  let imageUrl: string | undefined = truck.imageUrl || truck.image_url || truck.image || undefined;
  let lat: number | undefined = truck.lat !== undefined ? truck.lat : (truck.current_latitude !== undefined ? truck.current_latitude : undefined);
  let lng: number | undefined = truck.lng !== undefined ? truck.lng : (truck.current_longitude !== undefined ? truck.current_longitude : undefined);
  let gpsSource: 'mobile' | 'truck' | undefined = truck.gpsSource || truck.gps_source || undefined;
  let gpsDeviceId: string | undefined = truck.gpsDeviceId || truck.gps_device_id || undefined;
  let gpsSerialNumber: string | undefined = truck.gpsSerialNumber || truck.gps_serial_number || undefined;
  let gpsDeviceName: string | undefined = truck.gpsDeviceName || truck.gps_device_name || undefined;
  let gpsSimIccid: string | undefined = truck.gpsSimIccid || truck.gps_sim_iccid || undefined;
  let gpsStatus: 'Connected' | 'Disconnected' | 'Syncing' | 'Error' | undefined = truck.gpsStatus || truck.gps_status || truck.current_status || undefined;
  let gpsLastHandshake: string | undefined = truck.gpsLastHandshake || truck.gps_last_handshake || undefined;
  let gpsLat: number | undefined = truck.gpsLat !== undefined ? truck.gpsLat : (truck.gps_lat !== undefined ? truck.gps_lat : (truck.current_latitude !== undefined ? truck.current_latitude : undefined));
  let gpsLng: number | undefined = truck.gpsLng !== undefined ? truck.gpsLng : (truck.gps_lng !== undefined ? truck.gps_lng : (truck.current_longitude !== undefined ? truck.current_longitude : undefined));
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

  const imgMatch = getLastMatch(/\|\|imageUrl:([^|]+)/g);
  if (imgMatch) imageUrl = safeDecode(imgMatch);

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

  if (lat !== undefined && lng !== undefined) {
    const san = sanitizeGpsCoordinates(lat, lng);
    lat = san.lat;
    lng = san.lng;
  }

  if (gpsLat !== undefined && gpsLng !== undefined) {
    const sanGps = sanitizeGpsCoordinates(gpsLat, gpsLng);
    gpsLat = sanGps.lat;
    gpsLng = sanGps.lng;
  }

  const driverVal = truck.driver || truck.driver_name || truck.assigned_driver_id || 'No Driver';

  return {
    ...truck,
    type: cleanType,
    driver: driverVal,
    assignedDriverId: truck.assignedDriverId || truck.assigned_driver_id || (driverVal !== 'No Driver' ? driverVal : undefined),
    imageUrl: imageUrl || truck.image_url || truck.imageUrl,
    registrationDueDate,
    registrationExpiryDate: truck.registrationExpiryDate || truck.registration_expiry_date || registrationDueDate || '',
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
    branchId: truck.branchId || truck.branch_id || truck.branchid || truck.storeId || truck.store_id || '',
    branch_id: truck.branch_id || truck.branchId || truck.branchid || '',
    truckNumber: truck.truck_number || truck.truckNumber,
    vin: truck.vin,
    licensePlate: truck.license_plate || truck.licensePlate,
    make: truck.make,
    model: truck.model,
    year: truck.year ? Number(truck.year) : undefined,
    color: truck.color,
    vehicleType: truck.vehicle_type || truck.vehicleType || cleanType,
    capacityWeightKg: truck.capacity_weight_kg !== undefined && truck.capacity_weight_kg !== null ? Number(truck.capacity_weight_kg) : (truck.capacityWeightKg !== undefined ? Number(truck.capacityWeightKg) : undefined),
    capacityVolumeM3: truck.capacity_volume_m3 !== undefined && truck.capacity_volume_m3 !== null ? Number(truck.capacity_volume_m3) : (truck.capacityVolumeM3 !== undefined ? Number(truck.capacityVolumeM3) : undefined),
    fuelType: truck.fuel_type || truck.fuelType || 'Diesel',
    fuelTankCapacity: truck.fuel_tank_capacity !== undefined ? Number(truck.fuel_tank_capacity) : (truck.fuelTankCapacity !== undefined ? Number(truck.fuelTankCapacity) : undefined),
    currentMileage: truck.current_mileage !== undefined && truck.current_mileage !== null ? Number(truck.current_mileage) : (truck.currentMileage !== undefined ? Number(truck.currentMileage) : undefined),
    lastServiceDate: truck.last_service_date || truck.lastServiceDate,
    nextServiceDueDate: truck.next_service_due_date || truck.nextServiceDueDate,
    insurancePolicyNumber: truck.insurance_policy_number || truck.insurancePolicyNumber,
    insuranceExpiryDate: truck.insurance_expiry_date || truck.insuranceExpiryDate,
    userField1: truck.user_field_1 || truck.userField1,
    userField2: truck.user_field_2 || truck.userField2,
    isRefrigerated: truck.is_refrigerated !== undefined ? Boolean(truck.is_refrigerated) : Boolean(truck.isRefrigerated),
    isLiftgateEquipped: truck.is_liftgate_equipped !== undefined ? Boolean(truck.is_liftgate_equipped) : Boolean(truck.isLiftgateEquipped)
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
          persistSession: false,
          storageKey: 'prospaces_logistics_auth_token'
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
        persistSession: false,
        storageKey: 'prospaces_logistics_auth_token'
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

export async function saveUserHeartbeatDirect(tenantId: string, userId: string, lastActive: string) {
  const supabase = getFrontendSupabase();
  if (!supabase) return { supabaseActive: false };
  try {
    const { data: userData, error: fetchErr } = await supabase
      .from("users")
      .select("*")
      .eq("tenantId", tenantId)
      .eq("id", userId);

    if (fetchErr || !userData || userData.length === 0) {
      return { supabaseActive: false, error: "User not found" };
    }

    const user = deserializeFromPhone(userData[0]);
    const updatedPhone = serializeToPhone(
      user.phone,
      user.password,
      user.status,
      user.driverLicenseExpire,
      lastActive,
      user.resetRequest,
      user.avatarUrl
    );

    const { error: updateErr } = await supabase
      .from("users")
      .update({ phone: updatedPhone })
      .eq("tenantId", tenantId)
      .eq("id", userId);

    if (updateErr) throw updateErr;
    return { supabaseActive: true };
  } catch (err) {
    return { supabaseActive: false, error: err };
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
export async function fetchTenantStateDirect(rawTenantId: string) {
  const supabase = getFrontendSupabase();
  if (!supabase) {
    return { supabaseActive: false };
  }

  const tenantId = normalizeTenantId(rawTenantId);

  const [rBranches, rTrucks, rUsers, rDeliveries, rGpsUnits] = await Promise.all([
    supabase.from("branches").select("*").eq("tenantId", tenantId),
    supabase.from("trucks").select("*").eq("tenantId", tenantId),
    supabase.from("users").select("*").eq("tenantId", tenantId),
    supabase.from("deliveries").select("*").eq("tenantId", tenantId),
    supabase.from("gps_units_setup").select("*").eq("tenantId", tenantId)
  ]);

  if (rBranches.error || rTrucks.error || rUsers.error || rDeliveries.error) {
    const primaryError = rBranches.error || rTrucks.error || rUsers.error || rDeliveries.error;
    throw new Error(primaryError?.message || "Failed to query tables directly from Supabase.");
  }

  const gpsUnits = rGpsUnits?.data || [];
  const gpsMap = new Map<string, any>();
  gpsUnits.forEach((g: any) => {
    if (g.assignedTruckId) gpsMap.set(String(g.assignedTruckId).toLowerCase(), g);
    if (g.deviceId) gpsMap.set(String(g.deviceId).toLowerCase(), g);
  });

  const deserializedUsers = (rUsers.data || []).map((u: any) => deserializeFromPhone(u));
  const deserializedTrucks = (rTrucks.data || []).map((t: any) => {
    const dt = deserializeType(t);
    const matchedGps = gpsMap.get(String(t.id).toLowerCase()) || (t.gps_device_id ? gpsMap.get(String(t.gps_device_id).toLowerCase()) : null);
    if (matchedGps) {
      dt.gpsDeviceId = matchedGps.deviceId || dt.gpsDeviceId;
      dt.gpsSerialNumber = matchedGps.serialNumber || matchedGps.serial_number || dt.gpsSerialNumber;
      dt.gpsDeviceName = matchedGps.deviceName || dt.gpsDeviceName;
      dt.gpsSimIccid = matchedGps.simIccid || dt.gpsSimIccid;
      dt.gpsStatus = matchedGps.status || dt.gpsStatus || 'Connected';
      dt.gpsLastHandshake = matchedGps.lastHandshake || dt.gpsLastHandshake;
      if (typeof matchedGps.lastLatitude === 'number' && !isNaN(matchedGps.lastLatitude)) {
        dt.gpsLat = matchedGps.lastLatitude;
        dt.lat = matchedGps.lastLatitude;
      }
      if (typeof matchedGps.lastLongitude === 'number' && !isNaN(matchedGps.lastLongitude)) {
        dt.gpsLng = matchedGps.lastLongitude;
        dt.lng = matchedGps.lastLongitude;
      }
      if (matchedGps.deviceId && matchedGps.deviceId !== 'DISABLED') {
        dt.gpsSource = 'truck';
      }
    }
    return dt;
  });

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
    const deliveryPhotos = d.deliveryPhotos || meta.deliveryPhotos || (deliveryPhoto ? [deliveryPhoto] : undefined);
    const pdfUrl = d.pdfUrl || meta.pdfUrl;
    const documentType = d.documentType || meta.documentType;
    const weight = d.weight || meta.weight;
    const orderTotal = d.orderTotal || meta.orderTotal;
    const scheduledDate = d.scheduledDate || meta.scheduledDate || d.scheduled_date;
    const scheduledSlot = d.scheduledSlot || meta.scheduledSlot || d.scheduled_slot;
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
      deliveryPhotos,
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
  rawTenantId: string,
  deliveries: any[],
  trucks: any[],
  branches: any[],
  users: any[]
) {
  const supabase = getFrontendSupabase();
  if (!supabase) return { supabaseActive: false };

  const tenantId = normalizeTenantId(rawTenantId);

  // Deduplicate input arrays to prevent ON CONFLICT DO UPDATE rows violations
  const uniqueBranchesMap = new Map<string, any>();
  (branches || []).forEach(b => { if (b && b.id) uniqueBranchesMap.set(b.id, b); });
  const uniqueBranches = Array.from(uniqueBranchesMap.values());

  const uniqueTrucksMap = new Map<string, any>();
  (trucks || []).forEach(t => { 
    if (t && t.id) {
      const idKey = String(t.id).toLowerCase().trim();
      const unitNum = extractVehicleNumber(t.id) || extractVehicleNumber(t.name);

      let existingKey: string | undefined;
      for (const [k, v] of uniqueTrucksMap.entries()) {
        const vUnitNum = extractVehicleNumber(v.id) || extractVehicleNumber(v.name);
        if (k === idKey || (unitNum && vUnitNum && unitNum === vUnitNum)) {
          existingKey = k;
          break;
        }
      }

      if (!existingKey) {
        uniqueTrucksMap.set(idKey, t);
      } else {
        const existing = uniqueTrucksMap.get(existingKey)!;
        const isTDriverValid = t.driver && !['no driver', 'unassigned', 'driver', ''].includes(String(t.driver).trim().toLowerCase());
        const isExDriverValid = existing.driver && !['no driver', 'unassigned', 'driver', ''].includes(String(existing.driver).trim().toLowerCase());

        let driver = 'No Driver';
        if (isTDriverValid && isExDriverValid) {
          if (t.assignedDriverId && !existing.assignedDriverId) {
            driver = t.driver;
          } else if (existing.assignedDriverId && !t.assignedDriverId) {
            driver = existing.driver;
          } else {
            driver = t.driver || existing.driver;
          }
        } else if (isTDriverValid) {
          driver = t.driver;
        } else if (isExDriverValid) {
          driver = existing.driver;
        }

        uniqueTrucksMap.set(existingKey, {
          ...existing,
          ...t,
          driver
        });
      }
    } 
  });
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

  const serializedTrucks = uniqueTrucks.map(t => {
    const driverVal = t.driver || t.driver_name || t.assigned_driver_id || 'No Driver';
    const assignedDriverIdVal = t.assignedDriverId || t.assigned_driver_id || (driverVal !== 'No Driver' ? driverVal : null);
    const branchIdVal = t.branchId || t.branch_id || null;
    const regDate = sanitizeDateForDb(t.registrationDueDate || t.registration_due_date || t.registrationExpiryDate);
    const lastSvcDate = sanitizeDateForDb(t.lastServiceDate || t.last_service_date);
    const nextSvcDate = sanitizeDateForDb(t.nextServiceDueDate || t.next_service_due_date);
    const insExpDate = sanitizeDateForDb(t.insuranceExpiryDate || t.insurance_expiry_date);

    return {
      id: String(t.id),
      tenantId: t.tenantId || tenantId,
      name: t.name || `Truck ${t.id}`,
      type: serializeToType(t.type, regDate || undefined, t.imageUrl),
      driver: driverVal,
      driver_name: driverVal,
      assigned_driver_id: assignedDriverIdVal,
      assignedDriverId: assignedDriverIdVal,
      branchId: branchIdVal,
      branch_id: branchIdVal,
      image_url: t.imageUrl || t.image_url || null,
      imageUrl: t.imageUrl || t.image_url || null,
      registration_due_date: regDate,
      registrationDueDate: regDate,
      registration_expiry_date: regDate,
      registrationExpiryDate: regDate,
      truck_number: t.truckNumber || t.truck_number || null,
      truckNumber: t.truckNumber || t.truck_number || null,
      vin: t.vin || null,
      license_plate: t.licensePlate || t.license_plate || null,
      licensePlate: t.licensePlate || t.license_plate || null,
      make: t.make || null,
      model: t.model || null,
      year: sanitizeNumberForDb(t.year),
      color: t.color || null,
      vehicle_type: t.vehicleType || t.vehicle_type || t.type || null,
      capacity_weight_kg: sanitizeNumberForDb(t.capacityWeightKg || t.capacity_weight_kg),
      capacityWeightKg: sanitizeNumberForDb(t.capacityWeightKg || t.capacity_weight_kg),
      capacity_volume_m3: sanitizeNumberForDb(t.capacityVolumeM3 || t.capacity_volume_m3),
      capacityVolumeM3: sanitizeNumberForDb(t.capacityVolumeM3 || t.capacity_volume_m3),
      fuel_type: t.fuelType || t.fuel_type || null,
      fuelType: t.fuelType || t.fuel_type || null,
      fuel_tank_capacity: sanitizeNumberForDb(t.fuelTankCapacity || t.fuel_tank_capacity),
      current_mileage: sanitizeNumberForDb(t.currentMileage || t.current_mileage),
      currentMileage: sanitizeNumberForDb(t.currentMileage || t.current_mileage),
      last_service_date: lastSvcDate,
      lastServiceDate: lastSvcDate,
      next_service_due_date: nextSvcDate,
      nextServiceDueDate: nextSvcDate,
      insurance_policy_number: t.insurancePolicyNumber || t.insurance_policy_number || null,
      insurancePolicyNumber: t.insurancePolicyNumber || t.insurance_policy_number || null,
      insurance_expiry_date: insExpDate,
      insuranceExpiryDate: insExpDate,
      user_field_1: t.userField1 || t.user_field_1 || null,
      userField1: t.userField1 || t.user_field_1 || null,
      user_field_2: t.userField2 || t.user_field_2 || null,
      userField2: t.userField2 || t.user_field_2 || null,
      is_refrigerated: t.isRefrigerated ?? false,
      is_liftgate_equipped: t.isLiftgateEquipped ?? false
    };
  });

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
      tenantId: String(tenantId),
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
      deliveryPhotos: d.deliveryPhotos,
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
      scheduled_date: String(d.scheduledDate || d.registeredAt || d.date || new Date().toISOString()),
      assignedTruckId: String(d.assignedTruck || d.assignedTruckId || "unassigned"),
      assignedDriverId: String(d.assignedDriver || d.assignedDriverId || "unassigned"),
      status: String(d.status || "REGISTERED"),
      eta: String(d.eta || "N/A"),
      pickup_location: String(d.originBranch || "prospaces-dc"),
      items: [JSON.stringify({ _meta: fullMeta })]
    };
    
    return obj;
  });

  // Prepare GPS units setup records
  const gpsUnitsToUpsert = uniqueTrucks.map(t => {
    const devId = t.gpsDeviceId || `FC-${String(t.id).replace(/[^a-zA-Z0-9]/g, '')}`;
    const lat = typeof t.gpsLat === 'number' ? t.gpsLat : (typeof t.lat === 'number' ? t.lat : 44.6855);
    const lng = typeof t.gpsLng === 'number' ? t.gpsLng : (typeof t.lng === 'number' ? t.lng : -63.5825);
    return {
      id: `GPS-IMEI-${t.id}`,
      tenantId: String(tenantId),
      deviceId: devId,
      deviceName: t.gpsDeviceName || t.name || 'Samsara VG54 Core Gateway',
      simIccid: t.gpsSimIccid || 'Bell Mobility Business IoT',
      serialNumber: t.gpsSerialNumber || '0160293848',
      serial_number: t.gpsSerialNumber || '0160293848',
      status: t.gpsStatus || 'Connected',
      assignedTruckId: String(t.id),
      lastHandshake: t.gpsLastHandshake || new Date().toISOString(),
      lastLatitude: lat,
      lastLongitude: lng
    };
  });

  // Prepare GPS tracking history points
  const historyPointsToInsert = uniqueTrucks.map(t => {
    const devId = t.gpsDeviceId || `GPS-${t.id}`;
    const lat = typeof t.gpsLat === 'number' ? t.gpsLat : (typeof t.lat === 'number' ? t.lat : 44.6855);
    const lng = typeof t.gpsLng === 'number' ? t.gpsLng : (typeof t.lng === 'number' ? t.lng : -63.5825);
    const speed = typeof t.gpsSpeed === 'number' ? t.gpsSpeed : 0;
    const idlingMins = typeof t.gpsIdlingMins === 'number' ? t.gpsIdlingMins : 0;
    return {
      tenantId: String(tenantId),
      deviceId: devId,
      latitude: lat,
      longitude: lng,
      speed: speed,
      heading: 180.0,
      recordedAt: t.gpsLastHandshake || new Date().toISOString(),
      ignitionStatus: speed > 0 || idlingMins > 0,
      gps_device_id: devId,
      truck_id: String(t.id),
      speed_kph: speed,
      engine_status: speed > 0 ? 'Driving' : (idlingMins > 0 ? 'Idling' : 'Stopped'),
      created_date: new Date().toISOString()
    };
  });

  // Prepare geofences / gpsfences records
  const geofencesToUpsert = uniqueBranches.map(b => {
    let cLat = 44.6855;
    let cLng = -63.5825;
    if (b.address && b.address.includes('44.')) {
      const match = b.address.match(/(44\.\d+)[^\d-]+(-63\.\d+)/);
      if (match) {
        cLat = parseFloat(match[1]);
        cLng = parseFloat(match[2]);
      }
    }
    return {
      id: `GF-${b.id}`,
      tenantId: String(tenantId),
      name: `${b.name} Yard Geofence`,
      center_latitude: cLat,
      center_longitude: cLng,
      radius_meters: 250,
      branch_id: String(b.id)
    };
  });

  // Perform parallel upserts including GPS telemetry tables
  const truckUpsertPromise = (async () => {
    let payload = serializedTrucks;
    for (let attempt = 0; attempt < 20; attempt++) {
      const { error } = await supabase.from("trucks").upsert(payload);
      if (!error) break;
      const errMsg = error.message || String(error);
      const colMatch = errMsg.match(/'([^']+)' column/i) || errMsg.match(/column "?([^"\s]+)"? does not exist/i) || errMsg.match(/Could not find the '([^']+)' column/i);
      const missingCol = colMatch ? (colMatch[1] || colMatch[2] || colMatch[3]) : null;
      if (missingCol) {
        payload = payload.map((t: any) => {
          const c = { ...t };
          delete c[missingCol];
          return c;
        });
      } else {
        // Essential columns fallback
        payload = payload.map((t: any) => ({
          id: t.id,
          tenantId: t.tenantId,
          name: t.name,
          type: t.type,
          driver: t.driver,
          branchId: t.branchId,
          branch_id: t.branch_id
        }));
      }
    }
  })();

  await Promise.allSettled([
    supabase.from("branches").upsert(mappedBranches),
    truckUpsertPromise,
    supabase.from("users").upsert(serializedUsers),
    supabase.from("deliveries").upsert(mappedDeliveries),
    supabase.from("gps_units_setup").upsert(gpsUnitsToUpsert),
    supabase.from("gps_unit_setup").upsert(gpsUnitsToUpsert),
    supabase.from("gps_tracking_history").insert(historyPointsToInsert),
    supabase.from("geofences").upsert(geofencesToUpsert),
    supabase.from("gpsfences").upsert(geofencesToUpsert),
    supabase.from("gps_fences").upsert(geofencesToUpsert)
  ]);

  return { supabaseActive: true };
}

// Save or update an individual truck directly in Supabase
export async function saveTruckDirect(truck: any, tenantId: string) {
  const supabase = getFrontendSupabase();
  if (!supabase) return;
  const tid = String(tenantId);

  const driverVal = truck.driver || truck.driver_name || truck.assigned_driver_id || 'No Driver';
  const assignedDriverIdVal = truck.assignedDriverId || truck.assigned_driver_id || (driverVal !== 'No Driver' ? driverVal : null);
  const branchIdVal = truck.branchId || truck.branch_id || null;
  const regDate = sanitizeDateForDb(truck.registrationDueDate || truck.registration_due_date || truck.registrationExpiryDate);
  const lastSvcDate = sanitizeDateForDb(truck.lastServiceDate || truck.last_service_date);
  const nextSvcDate = sanitizeDateForDb(truck.nextServiceDueDate || truck.next_service_due_date);
  const insExpDate = sanitizeDateForDb(truck.insuranceExpiryDate || truck.insurance_expiry_date);

  const serialized: any = {
    id: String(truck.id),
    tenantId: tid,
    tenant_id: tid,
    name: truck.name || `Truck ${truck.id}`,
    type: serializeToType(truck.type, regDate || undefined, truck.imageUrl),
    driver: driverVal,
    driver_name: driverVal,
    assigned_driver_id: assignedDriverIdVal,
    assignedDriverId: assignedDriverIdVal,
    branchId: branchIdVal,
    branch_id: branchIdVal,
    image_url: truck.imageUrl || truck.image_url || null,
    imageUrl: truck.imageUrl || truck.image_url || null,
    registration_due_date: regDate,
    registrationDueDate: regDate,
    registration_expiry_date: regDate,
    registrationExpiryDate: regDate,
    truck_number: truck.truckNumber || truck.truck_number || null,
    truckNumber: truck.truckNumber || truck.truck_number || null,
    vin: truck.vin || null,
    license_plate: truck.licensePlate || truck.license_plate || null,
    licensePlate: truck.licensePlate || truck.license_plate || null,
    make: truck.make || null,
    model: truck.model || null,
    year: sanitizeNumberForDb(truck.year),
    color: truck.color || null,
    vehicle_type: truck.vehicleType || truck.vehicle_type || truck.type || null,
    capacity_weight_kg: sanitizeNumberForDb(truck.capacityWeightKg || truck.capacity_weight_kg),
    capacityWeightKg: sanitizeNumberForDb(truck.capacityWeightKg || truck.capacity_weight_kg),
    capacity_volume_m3: sanitizeNumberForDb(truck.capacityVolumeM3 || truck.capacity_volume_m3),
    capacityVolumeM3: sanitizeNumberForDb(truck.capacityVolumeM3 || truck.capacity_volume_m3),
    fuel_type: truck.fuelType || truck.fuel_type || null,
    fuelType: truck.fuelType || truck.fuel_type || null,
    fuel_tank_capacity: sanitizeNumberForDb(truck.fuelTankCapacity || truck.fuel_tank_capacity),
    current_mileage: sanitizeNumberForDb(truck.currentMileage || truck.current_mileage),
    currentMileage: sanitizeNumberForDb(truck.currentMileage || truck.current_mileage),
    last_service_date: lastSvcDate,
    lastServiceDate: lastSvcDate,
    next_service_due_date: nextSvcDate,
    nextServiceDueDate: nextSvcDate,
    insurance_policy_number: truck.insurancePolicyNumber || truck.insurance_policy_number || null,
    insurancePolicyNumber: truck.insurancePolicyNumber || truck.insurance_policy_number || null,
    insurance_expiry_date: insExpDate,
    insuranceExpiryDate: insExpDate,
    user_field_1: truck.userField1 || truck.user_field_1 || null,
    userField1: truck.userField1 || truck.user_field_1 || null,
    user_field_2: truck.userField2 || truck.user_field_2 || null,
    userField2: truck.userField2 || truck.user_field_2 || null,
    is_refrigerated: truck.isRefrigerated ?? false,
    is_liftgate_equipped: truck.isLiftgateEquipped ?? false
  };

  let payload = { ...serialized };
  for (let attempt = 0; attempt < 25; attempt++) {
    const { error } = await supabase.from("trucks").upsert(payload);
    if (!error) {
      console.log(`[saveTruckDirect] Successfully persisted truck ${truck.id} (driver: ${driverVal})`);
      break;
    }
    const errMsg = error.message || String(error);
    console.warn(`[saveTruckDirect] Upsert notice (attempt ${attempt + 1}):`, errMsg);
    const colMatch = errMsg.match(/'([^']+)' column/i) || errMsg.match(/column "?([^"\s]+)"? does not exist/i) || errMsg.match(/Could not find the '([^']+)' column/i);
    const colToStrip = colMatch ? (colMatch[1] || colMatch[2] || colMatch[3]) : null;
    if (colToStrip && payload[colToStrip] !== undefined) {
      delete payload[colToStrip];
    } else {
      // Fallback to essential columns
      const fallbackPayload: any = {
        id: serialized.id,
        tenantId: serialized.tenantId,
        name: serialized.name,
        type: serialized.type,
        driver: serialized.driver,
        branchId: serialized.branchId,
        branch_id: serialized.branch_id
      };
      await supabase.from("trucks").upsert(fallbackPayload).catch(console.warn);
      break;
    }
  }
}

// Save or update an individual delivery directly in Supabase
export async function saveDeliveryDirect(d: any, tenantId: string) {
  const supabase = getFrontendSupabase();
  if (!supabase) return;
  const tid = String(tenantId);

  const fullMeta = {
    id: String(d.id),
    tenantId: tid,
    invoiceNumber: String(d.invoiceNumber || d.orderNumber || d.id || ""),
    epicorSalesOrder: String(d.epicorSalesOrder || d.orderNumber || d.id || ""),
    customerName: String(d.customerName || d.customer || "N/A"),
    deliveryAddress: String(d.deliveryAddress || d.destination || "N/A"),
    phone: String(d.phone || ""),
    originBranch: String(d.originBranch || "DC-WINAMILL"),
    weight: d.weight,
    orderTotal: d.orderTotal,
    destinationNotes: d.destinationNotes,
    status: String(d.status || "REGISTERED"),
    registeredAt: String(d.registeredAt || d.date || new Date().toISOString()),
    pickedAt: d.pickedAt,
    deliveredAt: d.deliveredAt,
    returnedAt: d.returnedAt,
    returnReason: d.returnReason,
    assignedTruck: d.assignedTruck,
    assignedDriver: d.assignedDriver,
    assignedPicker: d.assignedPicker,
    customerSignature: d.customerSignature,
    deliveryPhoto: d.deliveryPhoto,
    deliveryPhotos: d.deliveryPhotos || (d.deliveryPhoto ? [d.deliveryPhoto] : []),
    pdfUrl: d.pdfUrl,
    documentType: d.documentType,
    scheduledDate: d.scheduledDate,
    scheduledSlot: d.scheduledSlot,
    deliveryCategory: d.deliveryCategory,
    history: d.history ? (typeof d.history === 'string' ? JSON.parse(d.history) : d.history) : []
  };

  const payload: any = {
    id: String(d.id),
    tenantId: tid,
    orderNumber: String(d.invoiceNumber || d.epicorSalesOrder || d.orderNumber || d.id || "N/A"),
    customer: String(d.customerName || d.customer || "N/A"),
    destination: String(d.deliveryAddress || d.destination || "N/A"),
    scheduled_date: String(d.scheduledDate || d.registeredAt || d.date || new Date().toISOString()),
    assignedTruckId: String(d.assignedTruck || d.assignedTruckId || "unassigned"),
    assignedDriverId: String(d.assignedDriver || d.assignedDriverId || "unassigned"),
    status: String(d.status || "REGISTERED"),
    eta: String(d.eta || "N/A"),
    pickup_location: String(d.originBranch || "DC-WINAMILL"),
    items: [JSON.stringify({ _meta: fullMeta })]
  };

  let obj = { ...payload };
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.from("deliveries").upsert(obj);
    if (!error) break;
    const errMsg = error.message || String(error);
    const colMatch = errMsg.match(/'([^']+)' column/i) || errMsg.match(/column "?([^"\s]+)"? does not exist/i) || errMsg.match(/Could not find the '([^']+)' column/i);
    if (colMatch && colMatch[1] && obj[colMatch[1]] !== undefined) {
      delete obj[colMatch[1]];
    } else {
      break;
    }
  }
}

// Delete record directly
export async function deleteRecordDirect(table: string, id: string, tenantId: string) {
  const supabase = getFrontendSupabase();
  if (!supabase) return;
  const tid = String(tenantId);
  const { error } = await supabase.from(table).delete().eq("id", id).eq("tenantId", tid);
  if (error) throw error;
  
  if (table === 'trucks') {
    await supabase.from("gps_units_setup").delete().eq("assignedTruckId", id).eq("tenantId", tid).catch(() => {});
    await supabase.from("gps_unit_setup").delete().eq("assignedTruckId", id).eq("tenantId", tid).catch(() => {});
    await supabase.from("gps_tracking_history").delete().eq("truck_id", id).eq("tenantId", tid).catch(() => {});
  } else if (table === 'branches') {
    await supabase.from("geofences").delete().eq("branch_id", id).eq("tenantId", tid).catch(() => {});
    await supabase.from("gpsfences").delete().eq("branch_id", id).eq("tenantId", tid).catch(() => {});
    await supabase.from("gps_fences").delete().eq("branch_id", id).eq("tenantId", tid).catch(() => {});
  }
}

// Clear all records for a tenant
export async function clearAllDirect(tenantId: string) {
  const supabase = getFrontendSupabase();
  if (!supabase) return;
  const tid = String(tenantId);
  await Promise.allSettled([
    supabase.from("deliveries").delete().eq("tenantId", tid),
    supabase.from("users").delete().eq("tenantId", tid),
    supabase.from("trucks").delete().eq("tenantId", tid),
    supabase.from("branches").delete().eq("tenantId", tid),
    supabase.from("gps_units_setup").delete().eq("tenantId", tid),
    supabase.from("gps_unit_setup").delete().eq("tenantId", tid),
    supabase.from("gps_tracking_history").delete().eq("tenantId", tid),
    supabase.from("geofences").delete().eq("tenantId", tid),
    supabase.from("gpsfences").delete().eq("tenantId", tid),
    supabase.from("gps_fences").delete().eq("tenantId", tid)
  ]);
}
