/* SUPABASE SCHEMA INITIALIZATION FOR PROSPACES DELIVERY AND LOGISTICS PORTAL */

-- 1. Create tenants table
create table if not exists tenants (
  id text primary key,
  name text not null,
  code text not null unique,
  description text,
  "logoBadge" text,
  "regionalFocus" text,
  "primaryColor" text default 'blue'
);

-- 2. Create branches table
create table if not exists branches (
  id text primary key,
  "tenantId" text not null,
  name text not null,
  type text not null, -- 'DC' or 'STORE'
  address text not null,
  
  -- Expanded logistics & store details
  branch_code varchar,
  branch_name varchar,
  branch_type varchar, -- 'STORE', 'DC', 'Depot', 'Warehouse', 'Pickup'
  address1 varchar,
  address2 varchar,
  city varchar,
  province_state varchar,
  postal_code varchar,
  country varchar,
  latitude double precision,
  longitude double precision,
  phone_number varchar,
  email varchar,
  manager_user_id varchar,
  operating_hours jsonb,
  time_zone varchar,
  loading_dock_count integer default 0,
  truck_capacity integer default 0,
  geofence_radius_meters integer default 100,
  is_active boolean default true,
  created_date timestamp default now(),
  updated_date timestamp default now(),
  inventory_capacity integer,
  cold_storage_available boolean default false,
  cross_dock_facility boolean default false,
  hazmat_certified boolean default false,
  fuel_station_available boolean default false,
  maintenance_facility_available boolean default false
);

-- 3. Create trucks/vehicles table
create table if not exists trucks (
  id text primary key,
  "tenantId" text not null,
  name text not null,
  type text not null,
  driver text not null,
  "branchId" text not null,
  "registrationDueDate" text,
  
  -- Expanded commercial fleet tracking & specs
  truck_number varchar,
  vin varchar,
  license_plate varchar,
  make varchar,
  model varchar,
  year integer,
  color varchar,
  vehicle_type varchar,
  capacity_weight_kg double precision,
  capacity_volume_m3 double precision,
  fuel_type varchar,
  fuel_tank_capacity double precision,
  current_mileage double precision,
  last_service_date date,
  next_service_due_date date,
  insurance_policy_number varchar,
  insurance_expiry_date date,
  registration_expiry_date date,
  gps_device_id varchar,
  assigned_driver_id varchar,
  is_refrigerated boolean default false,
  is_liftgate_equipped boolean default false,
  is_active boolean default true,
  created_date timestamp default now(),
  updated_date timestamp default now(),
  fuel_consumption double precision,
  engine_hours double precision,
  idle_time double precision,
  tire_pressure varchar,
  oil_level double precision,
  battery_health varchar,
  vehicle_health_score double precision,
  maintenance_status varchar,
  safety_inspection_status varchar
);

-- 4. Create users table
create table if not exists users (
  id text primary key,
  "tenantId" text not null,
  name text not null,
  email text not null,
  role text not null, -- 'Admin', 'Dispatcher', 'Driver', 'User', 'SUPER_ADMIN'
  phone text,
  "associatedStoreId" text,
  password text,
  status text default 'Active',
  "driverLicenseExpire" text,
  
  -- Expanded human resources & mobile tracking properties
  employee_number varchar,
  first_name varchar,
  last_name varchar,
  username varchar,
  mobile_phone varchar,
  alternate_phone varchar,
  password_hash varchar,
  role_id varchar,
  branch_id varchar,
  department varchar,
  job_title varchar,
  driver_license_number varchar,
  driver_license_class varchar,
  driver_license_expiry date,
  hire_date date,
  gps_device_id varchar,
  last_login_date timestamp,
  profile_photo_url varchar,
  preferred_language varchar,
  time_zone varchar,
  is_available boolean default true,
  emergency_contact_name varchar,
  emergency_contact_phone varchar,
  created_date timestamp default now(),
  updated_date timestamp default now(),
  created_by varchar,
  updated_by varchar,
  
  -- Modern driver app live telemetry
  current_latitude double precision,
  current_longitude double precision,
  current_status varchar,
  battery_level double precision,
  device_type varchar,
  mobile_app_version varchar,
  push_notification_token varchar
);

-- 5. Create deliveries table
create table if not exists deliveries (
  id text primary key,
  "tenantId" text not null,
  "invoiceNumber" text not null,
  "epicorSalesOrder" text not null,
  "customerName" text not null,
  "deliveryAddress" text not null,
  phone text not null,
  "originBranch" text not null,
  "weight" text,
  "orderTotal" text,
  "pdfUrl" text,
  "destinationNotes" text,
  status text not null,
  "registeredAt" text not null,
  "pickedAt" text,
  "deliveredAt" text,
  "returnedAt" text,
  "returnReason" text,
  "assignedTruck" text,
  "assignedDriver" text,
  "customerSignature" text,
  "deliveryPhoto" text,
  history jsonb default '[]'::jsonb,
  
  -- Additional delivery status tracking
  priority varchar default 'Medium', -- 'Low', 'Medium', 'High', 'Critical'
  scheduled_date text,
  tracking_number varchar,
  pickup_location text,
  dropoff_location text
);

-- 6. Create gps_units_setup table for built-in GPS hardware configurations in Trucks
create table if not exists gps_units_setup (
  id text primary key, -- hardware ID / IMEI
  "tenantId" text not null default 'prospaces',
  "deviceId" text not null unique, -- custom unique identifier
  "deviceName" text not null, -- label, e.g. "CalAmp LMU-3030" or "Built-in GPS Premium"
  "simIccid" text, -- SIM ICCID card number
  status text not null default 'Disconnected', -- 'Connected', 'Disconnected', 'Syncing', 'Error'
  "assignedTruckId" text references trucks(id) on delete set null, -- bound to specific truck
  "lastHandshake" text, -- formatted string representation
  "lastLatitude" double precision,
  "lastLongitude" double precision,
  "installedAt" text default now()::text
);

-- 7. Create gps_tracking_history table for telemetric tracking updates
create table if not exists gps_tracking_history (
  id uuid primary key default gen_random_uuid(),
  "tenantId" text not null default 'prospaces',
  "deviceId" text not null references gps_units_setup("deviceId") on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  speed double precision, -- speed in km/h or mph
  heading double precision, -- degrees (0-360)
  "recordedAt" text not null,
  "ignitionStatus" boolean default true,

  -- Expanded GPS tracking points
  gps_device_id varchar,
  truck_id varchar,
  user_id varchar,
  timestamp_utc timestamp,
  altitude double precision,
  speed_kph double precision,
  heading_degrees double precision,
  direction_accuracy_meters double precision,
  battery_level double precision,
  signal_strength varchar,
  location_source varchar,
  engine_status varchar,
  odometer_reading double precision,
  distance_since_last_ping double precision,
  geofence_id varchar,
  event_type varchar,
  created_date timestamp default now()
);

-- 8. Create routes table
create table if not exists routes (
  id text primary key,
  "tenantId" text not null default 'prospaces',
  truck_id text references trucks(id) on delete cascade,
  driver_id text references users(id) on delete set null,
  route_date date not null default now()::date,
  planned_distance double precision,
  actual_distance double precision,
  estimated_duration varchar,
  actual_duration varchar,
  status text default 'Planned' -- 'Planned', 'In Progress', 'Completed'
);

-- 9. Create route_stops table
create table if not exists route_stops (
  id text primary key,
  "tenantId" text not null default 'prospaces',
  route_id text references routes(id) on delete cascade,
  sequence_number integer not null,
  branch_id text references branches(id) on delete cascade,
  arrival_time timestamp,
  departure_time timestamp,
  status text default 'Pending' -- 'Pending', 'Arrived', 'Departed', 'Skipped'
);

-- 10. Create geofences table
create table if not exists geofences (
  id text primary key,
  "tenantId" text not null default 'prospaces',
  name text not null,
  center_latitude double precision not null,
  center_longitude double precision not null,
  radius_meters integer not null default 100,
  branch_id text references branches(id) on delete set null
);

-- 11. Create driver_behaviour table
create table if not exists driver_behaviour (
  id text primary key,
  "tenantId" text not null default 'prospaces',
  driver_id text references users(id) on delete cascade,
  event_time timestamp not null default now(),
  event_type varchar not null, -- 'Speeding', 'Harsh Braking', 'Rapid Acceleration', 'Cornering', 'Phone Use', 'Seatbelt Use'
  severity varchar default 'Medium', -- 'Low', 'Medium', 'High'
  points integer default 0
);

-- 12. Create vehicle_maintenance table
create table if not exists vehicle_maintenance (
  id text primary key,
  "tenantId" text not null default 'prospaces',
  truck_id text references trucks(id) on delete cascade,
  service_date date not null default now()::date,
  service_type varchar not null, -- 'Oil Change', 'Brake Pad Replacement', 'Tire Rotation', 'Annual Inspection', etc.
  mileage double precision,
  cost double precision,
  vendor varchar
);

-- Seed Initial Logistical Partners
insert into tenants (id, name, code, description, "logoBadge", "regionalFocus", "primaryColor") values
('prospaces', 'ProSpaces Logistics', 'PS', 'Corporate logistics tracking for ProSpaces distributor and dealer stores.', '🏢', 'Atlantic Canada (Dartmouth, Tantallon, Halifax)', 'blue')
on conflict (id) do nothing;

-- Seed GPS Setup data for the trucks (TRUCK-87 and TRUCK-28)
insert into gps_units_setup (id, "tenantId", "deviceId", "deviceName", "simIccid", status, "assignedTruckId", "lastHandshake", "lastLatitude", "lastLongitude") values
('GPS-IMEI-874812', 'prospaces', 'GPS-DEV-87', 'CalAmp LMU-3030 Premium', '8901410327981234567', 'Connected', 'TRUCK-87', '2026-07-01 06:00:00', 44.7082, -63.5938),
('GPS-IMEI-281932', 'prospaces', 'GPS-DEV-28', 'Sierra Wireless RV50X', '8901410327981234568', 'Connected', 'TRUCK-28', '2026-07-01 06:02:15', 44.6295, -63.6651)
on conflict (id) do nothing;

-- Seed GPS tracking history points for GPS-DEV-87
insert into gps_tracking_history (id, "tenantId", "deviceId", latitude, longitude, speed, heading, "recordedAt", "ignitionStatus") values
(gen_random_uuid(), 'prospaces', 'GPS-DEV-87', 44.7050, -63.5950, 45.2, 180.0, '2026-07-01 05:50:00', true),
(gen_random_uuid(), 'prospaces', 'GPS-DEV-87', 44.7065, -63.5942, 32.5, 175.5, '2026-07-01 05:55:00', true),
(gen_random_uuid(), 'prospaces', 'GPS-DEV-87', 44.7082, -63.5938, 0.0, 175.5, '2026-07-01 06:00:00', false)
on conflict (id) do nothing;

-- Seed GPS tracking history points for GPS-DEV-28
insert into gps_tracking_history (id, "tenantId", "deviceId", latitude, longitude, speed, heading, "recordedAt", "ignitionStatus") values
(gen_random_uuid(), 'prospaces', 'GPS-DEV-28', 44.6210, -63.6695, 65.0, 90.0, '2026-07-01 05:52:15', true),
(gen_random_uuid(), 'prospaces', 'GPS-DEV-28', 44.6255, -63.6672, 48.3, 85.0, '2026-07-01 05:57:15', true),
(gen_random_uuid(), 'prospaces', 'GPS-DEV-28', 44.6295, -63.6651, 0.0, 85.0, '2026-07-01 06:02:15', false)
on conflict (id) do nothing;

-- 6. Row-Level Security (RLS) Master Configuration & Policies
-- To turn RLS ON and protect your database, execute the following commands in your Supabase SQL Editor.

-- STEP 1: Enable Row-Level Security on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_units_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_behaviour ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;

-- STEP 2: Configure RLS Security Policies
-- Tenants policies
DROP POLICY IF EXISTS "Allow public read on tenants" ON tenants;
DROP POLICY IF EXISTS "Allow public write on tenants" ON tenants;
DROP POLICY IF EXISTS "Allow public update on tenants" ON tenants;
DROP POLICY IF EXISTS "Allow public delete on tenants" ON tenants;
CREATE POLICY "Allow public read on tenants" ON tenants FOR SELECT USING (true);
CREATE POLICY "Allow public write on tenants" ON tenants FOR INSERT WITH CHECK (id IS NOT NULL);
CREATE POLICY "Allow public update on tenants" ON tenants FOR UPDATE USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);
CREATE POLICY "Allow public delete on tenants" ON tenants FOR DELETE USING (id IS NOT NULL);

-- Branches policies
DROP POLICY IF EXISTS "Allow public read on branches" ON branches;
DROP POLICY IF EXISTS "Allow public write on branches" ON branches;
DROP POLICY IF EXISTS "Allow public update on branches" ON branches;
DROP POLICY IF EXISTS "Allow public delete on branches" ON branches;
CREATE POLICY "Allow public read on branches" ON branches FOR SELECT USING (true);
CREATE POLICY "Allow public write on branches" ON branches FOR INSERT WITH CHECK ("tenantId" IS NOT NULL);
CREATE POLICY "Allow public update on branches" ON branches FOR UPDATE USING ("tenantId" IS NOT NULL) WITH CHECK ("tenantId" IS NOT NULL);
CREATE POLICY "Allow public delete on branches" ON branches FOR DELETE USING ("tenantId" IS NOT NULL);

-- Trucks policies
DROP POLICY IF EXISTS "Allow public read on trucks" ON trucks;
DROP POLICY IF EXISTS "Allow public write on trucks" ON trucks;
DROP POLICY IF EXISTS "Allow public update on trucks" ON trucks;
DROP POLICY IF EXISTS "Allow public delete on trucks" ON trucks;
CREATE POLICY "Allow public read on trucks" ON trucks FOR SELECT USING (true);
CREATE POLICY "Allow public write on trucks" ON trucks FOR INSERT WITH CHECK ("tenantId" IS NOT NULL);
CREATE POLICY "Allow public update on trucks" ON trucks FOR UPDATE USING ("tenantId" IS NOT NULL) WITH CHECK ("tenantId" IS NOT NULL);
CREATE POLICY "Allow public delete on trucks" ON trucks FOR DELETE USING ("tenantId" IS NOT NULL);

-- Users policies
DROP POLICY IF EXISTS "Allow public read on users" ON users;
DROP POLICY IF EXISTS "Allow public write on users" ON users;
DROP POLICY IF EXISTS "Allow public update on users" ON users;
DROP POLICY IF EXISTS "Allow public delete on users" ON users;
CREATE POLICY "Allow public read on users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public write on users" ON users FOR INSERT WITH CHECK ("tenantId" IS NOT NULL);
CREATE POLICY "Allow public update on users" ON users FOR UPDATE USING ("tenantId" IS NOT NULL) WITH CHECK ("tenantId" IS NOT NULL);
CREATE POLICY "Allow public delete on users" ON users FOR DELETE USING ("tenantId" IS NOT NULL);

-- Deliveries policies
DROP POLICY IF EXISTS "Allow public read on deliveries" ON deliveries;
DROP POLICY IF EXISTS "Allow public write on deliveries" ON deliveries;
DROP POLICY IF EXISTS "Allow public update on deliveries" ON deliveries;
DROP POLICY IF EXISTS "Allow public delete on deliveries" ON deliveries;
CREATE POLICY "Allow public read on deliveries" ON deliveries FOR SELECT USING (true);
CREATE POLICY "Allow public write on deliveries" ON deliveries FOR INSERT WITH CHECK ("tenantId" IS NOT NULL);
CREATE POLICY "Allow public update on deliveries" ON deliveries FOR UPDATE USING ("tenantId" IS NOT NULL) WITH CHECK ("tenantId" IS NOT NULL);
CREATE POLICY "Allow public delete on deliveries" ON deliveries FOR DELETE USING ("tenantId" IS NOT NULL);

-- gps_units_setup policies
DROP POLICY IF EXISTS "Allow public read on gps_units_setup" ON gps_units_setup;
DROP POLICY IF EXISTS "Allow public write on gps_units_setup" ON gps_units_setup;
DROP POLICY IF EXISTS "Allow public update on gps_units_setup" ON gps_units_setup;
DROP POLICY IF EXISTS "Allow public delete on gps_units_setup" ON gps_units_setup;
CREATE POLICY "Allow public read on gps_units_setup" ON gps_units_setup FOR SELECT USING (true);
CREATE POLICY "Allow public write on gps_units_setup" ON gps_units_setup FOR INSERT WITH CHECK ("tenantId" IS NOT NULL);
CREATE POLICY "Allow public update on gps_units_setup" ON gps_units_setup FOR UPDATE USING ("tenantId" IS NOT NULL) WITH CHECK ("tenantId" IS NOT NULL);
CREATE POLICY "Allow public delete on gps_units_setup" ON gps_units_setup FOR DELETE USING ("tenantId" IS NOT NULL);

-- gps_tracking_history policies
DROP POLICY IF EXISTS "Allow public read on gps_tracking_history" ON gps_tracking_history;
DROP POLICY IF EXISTS "Allow public write on gps_tracking_history" ON gps_tracking_history;
DROP POLICY IF EXISTS "Allow public update on gps_tracking_history" ON gps_tracking_history;
DROP POLICY IF EXISTS "Allow public delete on gps_tracking_history" ON gps_tracking_history;
CREATE POLICY "Allow public read on gps_tracking_history" ON gps_tracking_history FOR SELECT USING (true);
CREATE POLICY "Allow public write on gps_tracking_history" ON gps_tracking_history FOR INSERT WITH CHECK ("tenantId" IS NOT NULL);
CREATE POLICY "Allow public update on gps_tracking_history" ON gps_tracking_history FOR UPDATE USING ("tenantId" IS NOT NULL) WITH CHECK ("tenantId" IS NOT NULL);
CREATE POLICY "Allow public delete on gps_tracking_history" ON gps_tracking_history FOR DELETE USING ("tenantId" IS NOT NULL);

-- Routes policies
DROP POLICY IF EXISTS "Allow public read on routes" ON routes;
DROP POLICY IF EXISTS "Allow public write on routes" ON routes;
DROP POLICY IF EXISTS "Allow public update on routes" ON routes;
DROP POLICY IF EXISTS "Allow public delete on routes" ON routes;
CREATE POLICY "Allow public read on routes" ON routes FOR SELECT USING (true);
CREATE POLICY "Allow public write on routes" ON routes FOR ALL USING (true) WITH CHECK (true);

-- Route stops policies
DROP POLICY IF EXISTS "Allow public read on route_stops" ON route_stops;
DROP POLICY IF EXISTS "Allow public write on route_stops" ON route_stops;
DROP POLICY IF EXISTS "Allow public update on route_stops" ON route_stops;
DROP POLICY IF EXISTS "Allow public delete on route_stops" ON route_stops;
CREATE POLICY "Allow public read on route_stops" ON route_stops FOR SELECT USING (true);
CREATE POLICY "Allow public write on route_stops" ON route_stops FOR ALL USING (true) WITH CHECK (true);

-- Geofences policies
DROP POLICY IF EXISTS "Allow public read on geofences" ON geofences;
DROP POLICY IF EXISTS "Allow public write on geofences" ON geofences;
DROP POLICY IF EXISTS "Allow public update on geofences" ON geofences;
DROP POLICY IF EXISTS "Allow public delete on geofences" ON geofences;
CREATE POLICY "Allow public read on geofences" ON geofences FOR SELECT USING (true);
CREATE POLICY "Allow public write on geofences" ON geofences FOR ALL USING (true) WITH CHECK (true);

-- Driver behaviour policies
DROP POLICY IF EXISTS "Allow public read on driver_behaviour" ON driver_behaviour;
DROP POLICY IF EXISTS "Allow public write on driver_behaviour" ON driver_behaviour;
DROP POLICY IF EXISTS "Allow public update on driver_behaviour" ON driver_behaviour;
DROP POLICY IF EXISTS "Allow public delete on driver_behaviour" ON driver_behaviour;
CREATE POLICY "Allow public read on driver_behaviour" ON driver_behaviour FOR SELECT USING (true);
CREATE POLICY "Allow public write on driver_behaviour" ON driver_behaviour FOR ALL USING (true) WITH CHECK (true);

-- Vehicle maintenance policies
DROP POLICY IF EXISTS "Allow public read on vehicle_maintenance" ON vehicle_maintenance;
DROP POLICY IF EXISTS "Allow public write on vehicle_maintenance" ON vehicle_maintenance;
DROP POLICY IF EXISTS "Allow public update on vehicle_maintenance" ON vehicle_maintenance;
DROP POLICY IF EXISTS "Allow public delete on vehicle_maintenance" ON vehicle_maintenance;
CREATE POLICY "Allow public read on vehicle_maintenance" ON vehicle_maintenance FOR SELECT USING (true);
CREATE POLICY "Allow public write on vehicle_maintenance" ON vehicle_maintenance FOR ALL USING (true) WITH CHECK (true);


/* ==============================================================================
   MIGRATION ALTERS: RUN THESE TO SAFELY UPGRADE YOUR ACTIVE SUPABASE DATABASE
   ============================================================================== */

-- Upgrade Branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_code varchar;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_name varchar;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_type varchar;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS address1 varchar;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS address2 varchar;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS city varchar;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS province_state varchar;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS postal_code varchar;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS country varchar;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS phone_number varchar;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS email varchar;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS manager_user_id varchar;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS operating_hours jsonb;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS time_zone varchar;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS loading_dock_count integer DEFAULT 0;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS truck_capacity integer DEFAULT 0;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS geofence_radius_meters integer DEFAULT 100;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS created_date timestamp DEFAULT now();
ALTER TABLE branches ADD COLUMN IF NOT EXISTS updated_date timestamp DEFAULT now();
ALTER TABLE branches ADD COLUMN IF NOT EXISTS inventory_capacity integer;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS cold_storage_available boolean DEFAULT false;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS cross_dock_facility boolean DEFAULT false;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS hazmat_certified boolean DEFAULT false;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS fuel_station_available boolean DEFAULT false;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS maintenance_facility_available boolean DEFAULT false;

-- Upgrade Trucks
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS truck_number varchar;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS vin varchar;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS license_plate varchar;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS make varchar;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS model varchar;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS year integer;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS color varchar;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS vehicle_type varchar;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS capacity_weight_kg double precision;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS capacity_volume_m3 double precision;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS fuel_type varchar;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS fuel_tank_capacity double precision;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS current_mileage double precision;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS last_service_date date;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS next_service_due_date date;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS insurance_policy_number varchar;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS insurance_expiry_date date;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS registration_expiry_date date;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS gps_device_id varchar;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS assigned_driver_id varchar;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS is_refrigerated boolean DEFAULT false;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS is_liftgate_equipped boolean DEFAULT false;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS created_date timestamp DEFAULT now();
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS updated_date timestamp DEFAULT now();
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS fuel_consumption double precision;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS engine_hours double precision;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS idle_time double precision;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS tire_pressure varchar;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS oil_level double precision;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS battery_health varchar;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS vehicle_health_score double precision;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS maintenance_status varchar;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS safety_inspection_status varchar;

-- Upgrade Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_number varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_phone varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS alternate_phone varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_license_number varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_license_class varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_license_expiry date;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hire_date date;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gps_device_id varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS time_zone varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_date timestamp DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_date timestamp DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_by varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_latitude double precision;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_longitude double precision;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_status varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS battery_level double precision;
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_type varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_app_version varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notification_token varchar;

-- Upgrade Deliveries
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS priority varchar DEFAULT 'Medium';
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS scheduled_date text;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS tracking_number varchar;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pickup_location text;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS dropoff_location text;

-- Upgrade GPS Tracking History
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS gps_device_id varchar;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS truck_id varchar;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS user_id varchar;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS timestamp_utc timestamp;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS altitude double precision;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS speed_kph double precision;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS heading_degrees double precision;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS direction_accuracy_meters double precision;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS battery_level double precision;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS signal_strength varchar;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS location_source varchar;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS engine_status varchar;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS odometer_reading double precision;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS distance_since_last_ping double precision;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS geofence_id varchar;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS event_type varchar;
ALTER TABLE gps_tracking_history ADD COLUMN IF NOT EXISTS created_date timestamp DEFAULT now();

-- Create API Connections table if not exists
CREATE TABLE IF NOT EXISTS api_connections (
  id text PRIMARY KEY,
  provider_name text,
  connection_type text,
  api_url text,
  api_key text,
  client_id text,
  client_secret text,
  access_token text,
  refresh_token text,
  token_expires_at text,
  is_active boolean DEFAULT true,
  created_at text,
  updated_at text
);