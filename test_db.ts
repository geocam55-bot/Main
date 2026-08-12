import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  const { error: e1 } = await supabase.from('gps_units_setup').select('assignedTruckId').limit(1);
  console.log("select assignedTruckId err:", e1);
  const { error: e2 } = await supabase.from('gps_units_setup').select('assigned_truck_id').limit(1);
  console.log("select assigned_truck_id err:", e2);
}
test();
