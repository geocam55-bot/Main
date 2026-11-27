import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://usorqldwroecyxucmtuw.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM';

function cleanEnvValue(val) {
  return String(val || '')
    .trim()
    .replace(/^['"\s]+|['"\s]+$/g, '');
}

export function getTenantSupabase(req) {
  const rawCustomUrl = cleanEnvValue(req?.headers?.['x-custom-supabase-url']);
  const rawCustomKey = cleanEnvValue(req?.headers?.['x-custom-supabase-key']);

  let url =
    (rawCustomUrl && /^https?:\/\//i.test(rawCustomUrl) ? rawCustomUrl : '') ||
    cleanEnvValue(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) ||
    FALLBACK_SUPABASE_URL;

  url = url
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/rest\/?$/i, '')
    .replace(/\/+$/, '');

  const key =
    cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY) ||
    rawCustomKey ||
    cleanEnvValue(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) ||
    FALLBACK_SUPABASE_ANON_KEY;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export function normalizeTenantId(rawTenantId) {
  if (!rawTenantId) return 'rona_atlantic';
  const tid = String(rawTenantId).trim();
  const lower = tid.toLowerCase();
  if (
    [
      'prospaces',
      'prospaces-dev',
      'prospaces-prod',
      'agfydicwfv8u0rqr5apc',
      'default',
      'undefined',
      'null',
      'rona',
      'rona-atlantic',
      'rona atlantic',
    ].includes(lower) ||
    lower.startsWith('rona')
  ) {
    return 'rona_atlantic';
  }
  return tid;
}

export function serializeToPhone(
  phone,
  password,
  status,
  driverLicenseExpire,
  lastActive,
  resetRequest,
  avatarUrl,
  roles
) {
  const basePhone = String(phone || '').trim();
  let res = basePhone;
  if (password) res += ` ||pw:${password}`;
  if (status) res += ` ||status:${status}`;
  if (driverLicenseExpire) res += ` ||licexp:${driverLicenseExpire}`;
  if (lastActive) res += ` ||lastact:${lastActive}`;
  if (resetRequest) res += ` ||resetreq:${resetRequest}`;
  if (avatarUrl) res += ` ||avatar:${avatarUrl}`;
  if (roles && Array.isArray(roles) && roles.length > 0) {
    res += ` ||roles:${roles.join(',')}`;
  }
  return res;
}

export function deserializeFromPhone(user) {
  if (!user) return user;
  const phone = String(user.phone || '');
  let cleanPhone = phone;
  let password = user.password || '';
  let status = user.status || 'Active';
  let driverLicenseExpire = user.driverLicenseExpire || '';
  let lastActive = '';
  let resetRequest = '';
  let avatarUrl = '';
  let encodedRoles = null;

  const pwMatch = phone.match(/\|\|pw:([^|]+)/);
  if (pwMatch) {
    password = pwMatch[1];
    cleanPhone = cleanPhone.replace(/\|\|pw:[^|]+/, '');
  }
  const statusMatch = phone.match(/\|\|status:([^|]+)/);
  if (statusMatch) {
    status = statusMatch[1];
    cleanPhone = cleanPhone.replace(/\|\|status:[^|]+/, '');
  }
  const licexpMatch = phone.match(/\|\|licexp:([^|]+)/);
  if (licexpMatch) {
    driverLicenseExpire = licexpMatch[1];
    cleanPhone = cleanPhone.replace(/\|\|licexp:[^|]+/, '');
  }
  const lastactMatch = phone.match(/\|\|lastact:([^|]+)/);
  if (lastactMatch) {
    lastActive = lastactMatch[1];
    cleanPhone = cleanPhone.replace(/\|\|lastact:[^|]+/, '');
  }
  const resetreqMatch = phone.match(/\|\|resetreq:([^|]+)/);
  if (resetreqMatch) {
    resetRequest = resetreqMatch[1];
    cleanPhone = cleanPhone.replace(/\|\|resetreq:[^|]+/, '');
  }
  const avatarMatch = phone.match(/\|\|avatar:([^|]+)/);
  if (avatarMatch) {
    avatarUrl = avatarMatch[1];
    cleanPhone = cleanPhone.replace(/\|\|avatar:[^|]+/, '');
  }
  const rolesMatch = phone.match(/\|\|roles:([^|]+)/);
  if (rolesMatch) {
    encodedRoles = rolesMatch[1]
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    cleanPhone = cleanPhone.replace(/\|\|roles:[^|]+/, '');
  }

  const rawRoles =
    user.roles && Array.isArray(user.roles) && user.roles.length > 0
      ? user.roles
      : encodedRoles && encodedRoles.length > 0
        ? encodedRoles
        : user.role
          ? [user.role]
          : ['User'];

  const roles = rawRoles.filter((r) => String(r).toUpperCase() !== 'SUPER_ADMIN');

  return {
    ...user,
    phone: cleanPhone.trim(),
    password,
    status,
    driverLicenseExpire,
    lastActive,
    resetRequest,
    avatarUrl,
    roles,
    role: user.role && user.role !== 'SUPER_ADMIN' ? user.role : roles[0] || 'User',
  };
}

export function serializeToType(type) {
  if (!type) return 'Commercial Truck';
  const clean = String(type).split('||')[0].trim();
  return clean || 'Commercial Truck';
}

export function deserializeType(truck) {
  if (!truck) return truck;
  const rawType = String(truck.type || '');
  const cleanType = rawType.split('||')[0].trim() || 'Commercial Truck';
  const driverVal = truck.driver || truck.driver_name || truck.assigned_driver_id || 'No Driver';

  return {
    ...truck,
    type: cleanType,
    driver: driverVal,
    assignedDriverId:
      truck.assignedDriverId ||
      truck.assigned_driver_id ||
      (driverVal !== 'No Driver' ? driverVal : undefined),
    imageUrl: truck.imageUrl || truck.image_url || truck.image,
    registrationDueDate:
      truck.registrationDueDate ||
      truck.registration_due_date ||
      truck.registrationExpiryDate ||
      truck.registration_expiry_date ||
      '',
    branchId:
      truck.branchId || truck.branch_id || truck.branchid || truck.storeId || truck.store_id || '',
    branch_id: truck.branch_id || truck.branchId || truck.branchid || '',
    isActive: truck.is_active !== false && truck.isActive !== false,
    is_active: truck.is_active !== false && truck.isActive !== false,
  };
}

export function sanitizeDateForDb(val) {
  if (!val || typeof val !== 'string' || val.trim() === '') return null;
  const str = val.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  const parsed = Date.parse(str);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().substring(0, 10);
  return null;
}

export function sanitizeNumberForDb(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return Number.isNaN(num) ? null : num;
}

export async function upsertRowsResilient(supabase, table, records, fallbackMinimalMapper) {
  if (!records || records.length === 0) return { error: null };
  let payload = records.map((r) => ({ ...r }));
  let lastError = null;
  let fallbackUsed = false;

  for (let attempt = 0; attempt < 20; attempt++) {
    const { error } = await supabase.from(table).upsert(payload);
    if (!error) return { error: null };

    lastError = error;
    const errMsg = error.message || String(error);
    const isMissingColumnError =
      (error.code === '42703' ||
        error.code === 'PGRST204' ||
        (errMsg.includes('column') &&
          (errMsg.includes('does not exist') || errMsg.includes('Could not find')))) &&
      !errMsg.includes('violates not-null constraint') &&
      error.code !== '23502';

    if (!isMissingColumnError) {
      return { error };
    }

    const colMatch =
      errMsg.match(/'([^']+)' column/i) ||
      errMsg.match(/column '([^']+)'/i) ||
      errMsg.match(/column "([^"]+)"/i) ||
      errMsg.match(/Could not find the '([^']+)' column/i);
    const colToStrip = colMatch ? colMatch[1] || colMatch[2] || colMatch[3] || colMatch[4] : null;

    if (colToStrip && payload.some((row) => row[colToStrip] !== undefined)) {
      payload = payload.map((row) => {
        const copy = { ...row };
        delete copy[colToStrip];
        return copy;
      });
      continue;
    }

    if (fallbackMinimalMapper && !fallbackUsed) {
      payload = payload.map(fallbackMinimalMapper);
      fallbackUsed = true;
      continue;
    }

    return { error };
  }

  return { error: lastError };
}
