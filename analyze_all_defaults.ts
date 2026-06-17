import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const key = 'user_planner_defaults:34638283-7b3d-47e2-bec8-a9e600e28c4a:59634269-20bb-4759-8bcf-6f5002d69eef';

  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error || !data?.value) {
    console.error('Failed to load defaults:', error);
    return;
  }

  const defaults = data.value;
  console.log(`Analyzing ${Object.keys(defaults).length} entries in user planner defaults...`);

  const missingKeys = [];
  const foundKeys = [];

  for (const [defKey, itemId] of Object.entries(defaults)) {
    if (!itemId || typeof itemId !== 'string' || defKey.endsWith('-cf')) continue;
    
    // Check if itemId exists in inventory
    const { data: invItem, error: invErr } = await supabase
      .from('inventory')
      .select('id, name, description, sku')
      .eq('id', itemId)
      .maybeSingle();

    if (invErr || !invItem) {
      missingKeys.push({ defKey, itemId });
    } else {
      foundKeys.push({ defKey, itemId, name: invItem.name, desc: invItem.description });
    }
  }

  console.log(`\n=== MISSING ITEMS IN CURRENT INVENTORY (${missingKeys.length}) ===`);
  console.log(JSON.stringify(missingKeys, null, 2));

  console.log(`\n=== FOUND ITEMS IN CURRENT INVENTORY (${foundKeys.length}) ===`);
  console.log(`Found ${foundKeys.length} items. Example:`, foundKeys.slice(0, 3));
}

main().catch(console.error);
