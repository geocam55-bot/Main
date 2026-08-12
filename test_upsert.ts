import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  const t = { id: "test", gpsDeviceId: "test", gpsLat: 0, gpsLng: 0, name: "test", gpsSimIccid: "test", gpsSerialNumber: "test", gpsStatus: "test", gpsLastHandshake: "test" };
  const gpsUnitsToUpsert = [{
    id: `GPS-IMEI-${t.id}`,
    tenantId: 'rona_atlantic',
    deviceId: 'test',
    deviceName: 'test',
    simIccid: 'test',
    serialNumber: 'test',
    serial_number: 'test',
    status: 'test',
    assignedTruckId: 'test',
    lastHandshake: new Date().toISOString(),
    lastLatitude: 0,
    lastLongitude: 0
  }];
  const { error: err1 } = await supabase.from("gps_units_setup").upsert(gpsUnitsToUpsert);
  console.log("gps_units_setup err:", err1);

  const { error: err2 } = await supabase.from("gps_unit_setup").upsert(gpsUnitsToUpsert);
  console.log("gps_unit_setup err:", err2);

  const historyPointsToInsert = [{
    tenantId: 'rona_atlantic',
    deviceId: 'test',
    latitude: 0,
    longitude: 0,
    speed: 0,
    heading: 180.0,
    recordedAt: new Date().toISOString(),
    ignitionStatus: true,
    gps_device_id: 'test',
    truck_id: 'test',
    speed_kph: 0,
    engine_status: 'test',
    created_date: new Date().toISOString()
  }];
  const { error: err3 } = await supabase.from("gps_tracking_history").insert(historyPointsToInsert);
  console.log("gps_tracking_history err:", err3);
}

test();
