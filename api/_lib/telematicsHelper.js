import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const FALLBACK_SUPABASE_URL = "https://usorqldwroecyxucmtuw.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";

export function getSupabase() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL).trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY).trim();
  return createClient(url, key);
}

export function decrypt(text) {
  if (!text) return text;
  const parts = text.split(':');
  if (parts.length !== 2) return text;
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const key = crypto.scryptSync('prospaces-telematics-secret-2026', 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    return text;
  }
}

export function encrypt(text) {
  if (!text) return text;
  if (text.includes(':') && text.split(':').length === 2 && /^[0-9a-f]{32}:/i.test(text)) return text;
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync('prospaces-telematics-secret-2026', 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export async function getActiveConnection() {
  const supabase = getSupabase();
  let conn = null;

  try {
    const { data, error } = await supabase
      .from('api_connections')
      .select('*')
      .eq('provider_name', 'Fleet Complete')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      conn = data[0];
    }
  } catch (e) {
    console.warn('[Serverless Helper] api_connections query warning:', e?.message || e);
  }

  if (!conn) {
    try {
      const { data } = await supabase
        .from('kv_store_8405be07')
        .select('value')
        .eq('key', 'fleet_complete_connection')
        .maybeSingle();

      if (data?.value) {
        conn = data.value;
      }
    } catch (e) {
      console.warn('[Serverless Helper] kv_store query warning:', e?.message || e);
    }
  }

  if (!conn) {
    conn = {
      id: "fc-connection-1",
      provider_name: "Fleet Complete",
      connection_type: "token",
      api_url: "https://api.fleetcomplete.com/login/token",
      client_id: "",
      client_secret: "",
      access_token: "",
      token_expires_at: null,
      is_active: true
    };
  }

  const decryptedConn = { ...conn };
  decryptedConn.api_key = decrypt(conn.api_key);
  decryptedConn.access_token = decrypt(conn.access_token);
  decryptedConn.refresh_token = decrypt(conn.refresh_token);
  decryptedConn.client_secret = decrypt(conn.client_secret);

  const envUser = process.env.FLEET_COMPLETE_USERNAME || process.env.FLEET_COMPLETE_USER || process.env.FLEETCOMPLETE_USERNAME || process.env.FLEETCOMPLETE_USER;
  const envPass = process.env.FLEET_COMPLETE_PASSWORD || process.env.FLEET_COMPLETE_PASS || process.env.FLEETCOMPLETE_PASSWORD || process.env.FLEETCOMPLETE_PASS;
  const envApiKey = process.env.FLEET_COMPLETE_API_KEY || process.env.FLEETCOMPLETE_API_KEY;

  if (envUser && !decryptedConn.client_id) decryptedConn.client_id = envUser;
  if (envPass && !decryptedConn.client_secret) decryptedConn.client_secret = envPass;
  if (envApiKey && !decryptedConn.api_key) decryptedConn.api_key = envApiKey;

  return decryptedConn;
}

export async function saveActiveConnection(conn) {
  const supabase = getSupabase();
  const existingConn = await getActiveConnection();

  let secretToUse = conn.client_secret;
  if (!secretToUse || secretToUse === '••••••••••••') {
    secretToUse = existingConn?.client_secret || secretToUse || '';
  }
  let apiKeyToUse = conn.api_key;
  if (!apiKeyToUse || apiKeyToUse === '••••••••••••') {
    apiKeyToUse = existingConn?.api_key || apiKeyToUse || '';
  }

  const record = {
    id: conn.id || existingConn?.id || "fc-connection-1",
    provider_name: 'Fleet Complete',
    connection_type: conn.connection_type || existingConn?.connection_type || 'token',
    api_url: conn.api_url || existingConn?.api_url || "https://api.fleetcomplete.com/login/token",
    api_key: apiKeyToUse ? encrypt(apiKeyToUse) : null,
    client_id: conn.client_id || existingConn?.client_id || '',
    client_secret: secretToUse ? encrypt(secretToUse) : null,
    access_token: conn.access_token ? encrypt(conn.access_token) : (existingConn?.access_token ? encrypt(existingConn.access_token) : null),
    refresh_token: conn.refresh_token ? encrypt(conn.refresh_token) : (existingConn?.refresh_token ? encrypt(existingConn.refresh_token) : null),
    token_expires_at: conn.token_expires_at || existingConn?.token_expires_at || null,
    is_active: true,
    last_error: null,
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.from('api_connections').upsert(record);
  } catch (e) {
    console.warn('[Serverless Helper] Failed to upsert to api_connections:', e?.message || e);
  }

  try {
    await supabase.from('kv_store_8405be07').upsert({
      key: 'fleet_complete_connection',
      value: record,
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    console.warn('[Serverless Helper] Failed to upsert to kv_store:', e?.message || e);
  }

  return record;
}

export async function getFleetCompleteToken(conn) {
  const activeConn = conn || await getActiveConnection();
  const apiKey = activeConn.api_key;
  const username = activeConn.client_id;
  const password = activeConn.client_secret;
  const tokenUrl = activeConn.api_url || "https://api.fleetcomplete.com/login/token";

  if (apiKey) {
    return { token: apiKey, fleetId: null, userId: null };
  }

  if (activeConn.access_token && activeConn.token_expires_at) {
    const expires = new Date(activeConn.token_expires_at).getTime();
    if (expires > Date.now() + 60000) {
      return { token: activeConn.access_token, fleetId: 'abb3c44d-0588-486d-9e49-441d9639727c', userId: null };
    }
  }

  if (!username || !password) {
    return { token: activeConn.access_token || null, fleetId: null, userId: null, error: 'No Fleet Complete credentials provided' };
  }

  try {
    // Attempt form-urlencoded grant_type=password
    let res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        username: username,
        password: password,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // Fallback: try JSON body format
      res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(8000),
      });
    }

    if (res.ok) {
      const data = await res.json();
      const token = data.access_token || data.token || data.bearer_token;
      if (token) {
        const cleanToken = String(token).replace(/^Bearer\s+/i, '').trim();
        const expiresIn = data.expires_in || 3600;
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        // Update active connection with latest token in background
        saveActiveConnection({
          ...activeConn,
          access_token: cleanToken,
          token_expires_at: expiresAt
        }).catch(() => {});

        return { token: cleanToken, fleetId: 'abb3c44d-0588-486d-9e49-441d9639727c', userId: null };
      }
    }
  } catch (err) {
    console.error('[Fleet Complete Auth Error]', err?.message || err);
  }

  return { token: activeConn.access_token || null, fleetId: null, userId: null };
}

export async function fetchLiveFleetCompleteVehicles() {
  const conn = await getActiveConnection();
  const { token, fleetId } = await getFleetCompleteToken(conn);

  if (!token) {
    return { success: false, vehicles: [], message: 'No active Fleet Complete token or credentials' };
  }

  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const headers = {
    Authorization: `Bearer ${cleanToken}`,
    'Content-Type': 'application/json',
  };
  if (fleetId) headers['fleetid'] = fleetId;

  // 1. Try GraphQL query
  const query = `
    query {
      getVehicles {
        id
        name
        vin
        licensePlate
        make
        model
        year
        deactivated
        latestData {
          timestamp
          gps {
            latitude
            longitude
            speed
            direction
            altitude
            satellites
          }
          address {
            address
            city
            region
            postalCode
            country
          }
          odometer {
            value
          }
          canBus {
            engineIdleTime
            canEngineCoolantTemperature
          }
          ignition {
            engineStatus
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://api.fleetcomplete.com/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const json = await res.json();
      const rawList = json.data?.getVehicles;

      if (rawList && Array.isArray(rawList) && rawList.length > 0) {
        const vehicles = rawList
          .filter((v) => v.name && v.name.trim() !== '' && !v.name.includes('[CANCELLED]'))
          .map((v) => {
            const latest = v.latestData || {};
            const gps = latest.gps || {};
            const canBus = latest.canBus || {};
            const ignition = latest.ignition || {};
            const odo = latest.odometer || {};
            const addr = latest.address || {};

            const lat = typeof gps.latitude === 'number' ? gps.latitude : null;
            const lng = typeof gps.longitude === 'number' ? gps.longitude : null;
            const speed = typeof gps.speed === 'number' ? Math.round(gps.speed) : 0;
            const heading = typeof gps.direction === 'number' ? Math.round(gps.direction) : 0;
            const engineIdleTime = typeof canBus.engineIdleTime === 'number' ? canBus.engineIdleTime : 0;
            const idlingMins = Math.floor(engineIdleTime / 60);

            let ignitionStatus = 'UNKNOWN';
            let motionStatus = 'STOPPED';

            if (ignition.engineStatus === true) {
              if (speed > 0) {
                ignitionStatus = 'ON';
                motionStatus = 'MOVING';
              } else {
                ignitionStatus = 'IDLING';
                motionStatus = 'IDLING';
              }
            } else if (ignition.engineStatus === false) {
              ignitionStatus = 'OFF';
              motionStatus = 'PARKED';
            } else {
              ignitionStatus = speed > 0 ? 'ON' : 'OFF';
              motionStatus = speed > 0 ? 'MOVING' : 'PARKED';
            }

            return {
              id: String(v.id || v.name),
              vehicleId: String(v.id || v.name),
              name: String(v.name || v.id),
              lat,
              lng,
              speed,
              heading,
              timestamp: latest.timestamp ? new Date(latest.timestamp).toISOString() : new Date().toISOString(),
              ignitionStatus,
              motionStatus,
              idlingMins,
              hardwareId: String(v.id),
              vin: v.vin || '',
              licensePlate: v.licensePlate || '',
              make: v.make || '',
              model: v.model || '',
              year: v.year || '',
              odometer: odo?.value || 0,
              address: addr?.address ? `${addr.address}, ${addr.city || ''} ${addr.region || ''}`.trim() : '',
              isLive: true,
              source: 'fleet_complete'
            };
          });

        return { success: true, vehicles, source: 'fleet_complete', fleetId };
      }
    }
  } catch (err) {
    console.warn('[Serverless Helper] Fleet Complete GraphQL notice:', err?.message || err);
  }

  // 2. Fallback: REST positions endpoint
  try {
    const restRes = await fetch('https://api.fleetcomplete.com/v1.0/vehicle/positions', {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(8000),
    });

    if (restRes.ok) {
      const restData = await restRes.json();
      const list = Array.isArray(restData) ? restData : (restData.positions || restData.vehicles || []);
      if (list.length > 0) {
        const vehicles = list.map((item, idx) => {
          const speed = typeof item.speed === 'number' ? Math.round(item.speed) : 0;
          const isMoving = speed > 0;
          return {
            id: String(item.id || item.vehicleId || `FC-${idx + 1}`),
            vehicleId: String(item.id || item.vehicleId || `FC-${idx + 1}`),
            name: String(item.name || item.vehicleName || `Unit #${idx + 1}`),
            lat: typeof item.latitude === 'number' ? item.latitude : (item.lat || null),
            lng: typeof item.longitude === 'number' ? item.longitude : (item.lng || null),
            speed: speed,
            heading: typeof item.direction === 'number' ? item.direction : (item.heading || 0),
            timestamp: item.timestamp || item.dateTime || new Date().toISOString(),
            ignitionStatus: isMoving ? 'ON' : (item.ignition ? 'IDLING' : 'OFF'),
            motionStatus: isMoving ? 'MOVING' : (item.ignition ? 'IDLING' : 'PARKED'),
            idlingMins: item.idlingTime || 0,
            vin: item.vin || '',
            licensePlate: item.licensePlate || item.plate || '',
            odometer: item.odometer || 0,
            address: item.address || '',
            isLive: true,
            source: 'fleet_complete'
          };
        });

        return { success: true, vehicles, source: 'fleet_complete', fleetId };
      }
    }
  } catch (err) {
    console.warn('[Serverless Helper] Fleet Complete REST notice:', err?.message || err);
  }

  return { success: false, vehicles: [], message: 'No live telemetry reported from Fleet Complete at this moment' };
}
