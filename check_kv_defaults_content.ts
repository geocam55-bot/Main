import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const keys = [
    'user_planner_defaults:34638283-7b3d-47e2-bec8-a9e600e28c4a:59634269-20bb-4759-8bcf-6f5002d69eef',
    'user_planner_defaults:34638283-7b3d-47e2-bec8-a9e600e28c4a:021fb593-97a5-444b-863d-9b3c15e00eb7'
  ];

  for (const key of keys) {
    const { data, error } = await supabase
      .from('kv_store_8405be07')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching key ${key}:`, error);
    } else {
      console.log(`\nKey: ${key}`);
      console.log(JSON.stringify(data?.value, null, 2));
    }
  }
}

main().catch(console.error);
