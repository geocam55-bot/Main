#!/usr/bin/env node

/**
 * Script to recreate and verify trucks in Supabase with RLS (Row Level Security) on.
 * Run with: node scripts/recreate_trucks_with_rls.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://usorqldwroecyxucmtuw.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjY2MjY3OSwiZXhwIjoyMDc4MjM4Njc5fQ.0fLGibg1UUzrWOTIgyqzNBytMPlES9xP8AHXOWGHmnY';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM';

const TRUCKS = [
  { id: '2501 - Elmsdale 6X Boom', name: '2501 - Elmsdale 6X Boom', type: '2025 Western Star 47X 6x4 Heavy Boom Crane', driver: 'Steve Conrad', branchId: 'RONA-03485', tenantId: 'rona_atlantic', is_active: true },
  { id: '2502 - Elmsdale 4X Boom', name: '2502 - Elmsdale 4X Boom', type: '2025 Freightliner M2 106 4x2 Boom Truck', driver: 'No Driver', branchId: 'RONA-03485', tenantId: 'rona_atlantic', is_active: true },
  { id: '2503 - Elmsdale 6X Boom', name: '2503 - Elmsdale 6X Boom', type: '2025 Kenworth T880 6x4 Heavy Boom Crane', driver: 'Erik Nielsen', branchId: 'RONA-03485', tenantId: 'rona_atlantic', is_active: true },
  { id: '2504 - Elmsdale 6X Boom', name: '2504 - Elmsdale 6X Boom', type: '2025 Western Star 47X 6x4 Heavy Boom Crane', driver: 'Erik Nielsen', branchId: 'RONA-03485', tenantId: 'rona_atlantic', is_active: true },
  { id: '1802 - Elmsdale 4X Boom', name: '1802 - Elmsdale 4X Boom', type: '2018 Freightliner M2 106 4x2 Boom Crane', driver: 'No Driver', branchId: 'RONA-03485', tenantId: 'rona_atlantic', is_active: true },
  { id: '1803 - Elmsdale S/A Curtain', name: '1803 - Elmsdale S/A Curtain', type: '2018 International MV607 Single Axle Curtain-side', driver: 'No Driver', branchId: 'RONA-03485', tenantId: 'rona_atlantic', is_active: true },
  { id: '1901 - Elmsdale HH', name: '1901 - Elmsdale HH', type: 'Heavy-Duty Flatbed', driver: 'No Driver', branchId: 'RONA-03485', tenantId: 'rona_atlantic', is_active: true },
  { id: '1702 - Elmsdale HH', name: '1702 - Elmsdale HH', type: 'Heavy-Duty Flatbed', driver: 'Chris Fraser', branchId: 'RONA-03485', tenantId: 'rona_atlantic', is_active: true },
  { id: '701 - Elmsdale T/A Flatdeck', name: '701 - Elmsdale T/A Flatdeck', type: '2020 Peterbilt 337 Tandem-Axle Flatbed', driver: 'Dave Higgins', branchId: 'RONA-03485', tenantId: 'rona_atlantic', is_active: true },
  { id: '1903 - Elmsdale Windows', name: '1903 - Elmsdale Windows', type: 'Curtain-side Flatbed', driver: 'Travis Vickers', branchId: 'RONA-03485', tenantId: 'rona_atlantic', is_active: true },
  { id: '2409 - Elmsdale F150', name: '2409 - Elmsdale F150', type: '2024 Ford F-150 XLT 4x4', driver: 'Mike MacDonald', branchId: 'RONA-03485', tenantId: 'rona_atlantic', is_active: true },
  { id: '2101 - Dartmouth F150', name: '2101 - Dartmouth F150', type: 'Fleet Pickup Truck 4x4', driver: 'Bob Rafters', branchId: 'RONA-03510', tenantId: 'rona_atlantic', is_active: true },
  { id: '2401 - Halifax F150', name: '2401 - Halifax F150', type: '2024 Ford F-150 SuperCrew 4x4 (Almon OSR)', driver: 'No Driver', branchId: 'RONA-03480', tenantId: 'rona_atlantic', is_active: true },
  { id: '2408 - Halifax F150 OSR', name: '2408 - Halifax F150 OSR', type: '2024 Ford F-150 XL 4x4 (Halifax OSR)', driver: 'No Driver', branchId: 'RONA-03480', tenantId: 'rona_atlantic', is_active: true },
  { id: '2410 - Tantallon F150', name: '2410 - Tantallon F150', type: 'Fleet Pickup Truck 4x4', driver: 'No Driver', branchId: 'RONA-03490', tenantId: 'rona_atlantic', is_active: true },
  { id: '2412 - Tantallon Ranger', name: '2412 - Tantallon Ranger', type: '2024 Ford Ranger XLT 4x4', driver: 'No Driver', branchId: 'RONA-03490', tenantId: 'rona_atlantic', is_active: true }
];

async function run() {
  console.log('Connecting to Supabase at:', SUPABASE_URL);

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  console.log(`\n1. Recreating/upserting ${TRUCKS.length} trucks using service role...`);
  const { data: upsertData, error: upsertErr } = await adminClient
    .from('trucks')
    .upsert(TRUCKS, { onConflict: 'id' });

  if (upsertErr) {
    console.error('Error upserting trucks:', upsertErr.message);
  } else {
    console.log('✓ Successfully upserted all trucks.');
  }

  console.log('\n2. Verifying trucks using Service Role Key (bypasses RLS):');
  const { data: adminTrucks, error: adminErr } = await adminClient
    .from('trucks')
    .select('id, name, driver, branchId, tenantId, is_active')
    .eq('tenantId', 'rona_atlantic');

  if (adminErr) {
    console.error('Service role query error:', adminErr.message);
  } else {
    console.log(`✓ Service role query found ${adminTrucks.length} trucks.`);
  }

  console.log('\n3. Verifying trucks using Anon Key (subject to RLS):');
  const { data: anonTrucks, error: anonErr } = await anonClient
    .from('trucks')
    .select('id, name, driver, branchId, tenantId, is_active')
    .eq('tenantId', 'rona_atlantic');

  if (anonErr) {
    console.error('Anon key query error (RLS blocked):', anonErr.message);
  } else {
    console.log(`✓ Anon key query found ${anonTrucks.length} trucks.`);
  }

  console.log('\n======================================================');
  console.log('SQL SCRIPT TO RUN IN SUPABASE SQL EDITOR TO ENSURE RLS POLICIES ALLOW PROPER ACCESS:');
  console.log('======================================================');
  console.log(`
-- 1. Ensure RLS is active
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow all read on trucks" ON public.trucks;
DROP POLICY IF EXISTS "Allow all insert on trucks" ON public.trucks;
DROP POLICY IF EXISTS "Allow all update on trucks" ON public.trucks;
DROP POLICY IF EXISTS "Allow all delete on trucks" ON public.trucks;

-- 3. Create policies permitting public/authenticated access
CREATE POLICY "Allow all read on trucks" ON public.trucks FOR SELECT TO public USING (true);
CREATE POLICY "Allow all insert on trucks" ON public.trucks FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow all update on trucks" ON public.trucks FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on trucks" ON public.trucks FOR DELETE TO public USING (true);
  `);
}

run().catch(console.error);
