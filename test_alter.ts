import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      DROP TABLE IF EXISTS gps_units_setup;
      create table gps_units_setup (
        id text primary key, -- hardware ID / IMEI
        "tenantId" text not null default 'rona_atlantic',
        "deviceId" text not null, -- custom unique identifier
        "deviceName" text not null, -- label, e.g. "CalAmp LMU-3030"
        "simIccid" text,
        "serialNumber" text,
        "serial_number" text,
        status text not null default 'Disconnected',
        "assignedTruckId" text,
        "lastHandshake" text,
        "lastLatitude" double precision,
        "lastLongitude" double precision,
        "installedAt" text default now()::text
      );

      DROP TABLE IF EXISTS gps_tracking_history;
      create table gps_tracking_history (
        id uuid primary key default gen_random_uuid(),
        "tenantId" text not null default 'rona_atlantic',
        "deviceId" text not null,
        latitude double precision not null,
        longitude double precision not null,
        speed double precision,
        heading double precision,
        "recordedAt" text not null,
        "ignitionStatus" boolean default true,
        gps_device_id text,
        truck_id text,
        user_id text,
        timestamp_utc timestamp,
        altitude double precision,
        speed_kph double precision,
        heading_degrees double precision,
        direction_accuracy_meters double precision,
        battery_level double precision,
        engine_status text,
        created_date text
      );

      NOTIFY pgrst, 'reload schema';
    `
  });
  console.log("alter err:", error);
}
test();
