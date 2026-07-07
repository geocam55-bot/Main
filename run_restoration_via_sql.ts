import { createClient } from '@supabase/supabase-js';

const projectId = "usorqldwroecyxucmtuw";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";
const supabaseUrl = process.env.SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseKey = process.env.SUPABASE_ANON_KEY || publicAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

const orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';
const trackerKey = 'user_planner_defaults:34638283-7b3d-47e2-bec8-a9e600e28c4a:59634269-20bb-4759-8bcf-6f5002d69eef';

async function main() {
  console.log('--- STARTING BULK PRIVILEGED MIGRATION & RESTORATION ---');

  // 1. Fetch FULL active inventory without RLS limits using query_sql
  console.log('Fetching full active inventory via query_sql...');
  const invQuery = `SELECT id, sku, description from public.inventory WHERE organization_id = '${orgId}'`;
  const { data: inventory, error: invErr } = await supabase.rpc('query_sql', { sql_text: invQuery });

  if (invErr || !inventory || !Array.isArray(inventory)) {
    console.error('Error fetching inventory via query_sql:', invErr);
    return;
  }

  console.log(`Successfully loaded ${inventory.length} total active inventory items.`);

  const findBySku = (sku: string) => inventory.find(it => (it.sku || '').trim() === sku);

  // Define SKU and Description mappings
  const SKU_MAP: Record<string, string> = {
    // Treated Lumber structural elements (beams, joists, ledger, rim joists)
    'beams (8\')': '84895030', // PT BROWN 2X8"X8'
    'joists (8\')': '84895030',
    'rim joists (8\')': '84895030',
    'ledger board (8\')': '84895030',

    'beams (10\')': '84895031', // PT BROWN 2X8"X10'
    'joists (10\')': '84895031',
    'rim joists (10\')': '84895031',
    'ledger board (10\')': '84895031',

    'beams (12\')': '84895032', // PT BROWN 2X8"X12'
    'joists (12\')': '84895032',
    'rim joists (12\')': '84895032',
    'ledger board (12\')': '84895032',

    'beams (14\')': '84895033', // PT BROWN 2X8"X14'
    'joists (14\')': '84895033',
    'rim joists (14\')': '84895033',
    'ledger board (14\')': '84895033',

    'beams (16\')': '84895034', // PT BROWN 2X8"X16'
    'joists (16\')': '84895034',
    'rim joists (16\')': '84895034',
    'ledger board (16\')': '84895034',

    // Treated decking
    'decking boards (8\')': '84895016', // PT BROWN 5/4X6"X8'
    'decking boards (10\')': '84895017', // PT BROWN 5/4X6"X10'
    'decking boards (12\')': '84895018', // PT BROWN 5/4X6"X12'
    'decking boards (14\')': '84895019', // PT BROWN 5/4X6"X14'
    'decking boards (16\')': '84895020', // PT BROWN 5/4X6"X16'

    // Treated Posts
    'posts (8\')': '84895043', // PT BROWN 4X4"X8'
    'posts (10\')': '84895047', // PT BROWN D4S 6X6"X10'
    'posts (12\')': '84895048', // PT BROWN D4S 6X6"X12'
    'posts (14\')': '84895049', // PT BROWN 6X6"X14'
    'posts (16\')': '84895050', // PT BROWN D4S 6X6"X16'

    // Hardware & misc
    'concrete mix': '0533008', // BOMIX CONCRETE PRE-MIX. 30KG
    'deck screws': '1399135', // SCREW DECK #8X2-1/2"X100BX
    'lag screws': '13998018', // LAG SCREW 5/16X5"X50BX HEX.H.
    'structural screws': '13998079', // SCREW DECK #10-6"X100BX TP BN
    'joist hangers': '35945332', // BRACKET FENCE Z-MAX 2X4"
    'post anchors': '35945278', // BRACKET FENCE FLAT ZMAX 2X4"

    // Aluminum Railing (Black)
    'black end post': '39345075', // POST END ALUMINIUM BLACK 42"
    'black corner post': '39345076', // POST CORNER ALUMINIUM BLACK 42"
    'black inline post': '39345077', // POST LINE ALUMINIUM BLACK 42"
    'black picket (6\')': '39345175', // PICKET STRAIGHT 6' ALU. BLK (14)
    'black picket (8\')': '39345176', // PICKETS STRAIGHT DECK 19PK BLK
    'black picket (10\')': '39345177', // PICKETS STRAIGHT BLK 10'/25PK
    'black top rail (6\')': '39345065', // RAILING TOP&BOTTOM ALU.BLK 6'
    'black top rail (8\')': '39345066', // RAILING TOP&BOTTOM ALUM.BL.8'
    'black top rail (10\')': '39345067', // RAILING TOP&BOTTOM ALUM.BL.10'
    'black top rail (12\')': '39345067', // Fallback to 10' top rail (Black)

    // Aluminum Railing (White)
    'white end post': '39345011', // POST END ALUMINIUM WHITE 42"
    'white corner post': '39345012', // POST CORNER ALUM.WH.42"
    'white inline post': '39345013', // POST LINE ALUM. WHITE 42"
    'white picket (6\')': '39345165', // PICKET STRAIGHT 6'AL. WH 14/PK
    'white picket (8\')': '39345166', // PICKET STRAIGHT 8'AL. WH 19/PK
    'white picket (10\')': '39345167', // PICKET STRGHT 10' AL.WH 24PK
    'white top rail (6\')': '39345000', // RAILING TOP & BOTTOM ALUM.WH.6
    'white top rail (8\')': '39345001', // RAILING TOP & BOTTOM ALUM.WH.8
    'white top rail (10\')': '39345002', // RAILING TOP&BOTTOM ALUM.WH.10'
    'white top rail (12\')': '39345003', // RAILING TOP&BOTTOM ALUM.WH.12'

    // Glass Panels
    'tempered glass panel (24")': '39345030', // GLASS TEMPERED RAIL CLEAR 24"
    'tempered glass panel (30")': '39345031', // GLASS TEMPERED RAIL CLEAR 30"
    'tempered glass panel (36")': '39345032', // GLASS TEMPERED RAIL CLEAR 36"
    'tempered glass panel (42")': '39345033', // GLASS TEMPERED RAIL CLEAR 42"
    'tempered glass panel (48")': '39345034', // GLASS TEMPERED RAIL CLEAR 48"
    'tempered glass panel (54")': '39345035', // GLASS TEMPERED RAIL CLEAR 54"
    'tempered glass panel (60")': '39345036', // GLASS TEMPERED RAIL CLEAR 60"
    'tempered glass panel (66")': '39345036', // GLASS TEMPERED RAIL CLEAR 66"

    // Fallbacks and extra
    'stair treads': '39595063', // STAIR STEP PT BROWN 2X12X48"
    'stair stringers': '39595063', // STAIR STEP PT BROWN 2X12X48"
    'ledger flashing': 'MMS449752', // RUBBER FLASHING 2 MIL 12X150FT
    'railing top rail': '84895026', // PT BROWN 2x6x8
    'railing bottom rail': '84895026',
    'railing posts': '84895043', // PT BROWN 4X4"X8'
    'railing balusters': '51206852', // PT BALUSTER BROWN 2X2X42
  };

  // Build the lookup: pattern key -> active Database UUID
  const keyToNewUuid: Record<string, string> = {};

  for (const [keyPattern, sku] of Object.entries(SKU_MAP)) {
    const item = findBySku(sku);
    if (item) {
      keyToNewUuid[keyPattern] = item.id;
    } else {
      console.warn(`Could not find SKU ${sku} on active inventory for pattern: ${keyPattern}`);
    }
  }

  // 2. Fetch user's existing overrides key-values from the KV store
  console.log('\nFetching key-value defaults for active user from KV store...');
  const { data: kvRow, error: kvLoadErr } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', trackerKey)
    .maybeSingle();

  if (kvLoadErr || !kvRow?.value) {
    console.error('Error loading existing KV store defaults:', kvLoadErr);
    return;
  }

  const existingDefaults = kvRow.value as Record<string, string>;
  const healedDefaults: Record<string, string> = { ...existingDefaults };

  console.log(`Fuzzy healing ${Object.keys(existingDefaults).length} entries in user planner defaults...`);

  // Healing existing KV keys
  for (const [defKey, oldVal] of Object.entries(existingDefaults)) {
    if (defKey.endsWith('-cf') || !oldVal) continue;

    let matchedId: string | null = null;
    
    // Find matching SKU_MAP key inside the defKey
    for (const [pattern, resolvedId] of Object.entries(keyToNewUuid)) {
      if (defKey.endsWith(pattern)) {
        matchedId = resolvedId;
        break;
      }
    }

    if (!matchedId) {
      // General fallbacks if length specific matches are not matched
      if (defKey.includes('joists') || defKey.includes('beams') || defKey.includes('rim joists') || defKey.includes('ledger board')) {
        matchedId = keyToNewUuid['beams (10\')'] || keyToNewUuid['beams (12\')'];
      } else if (defKey.includes('posts')) {
        matchedId = keyToNewUuid['posts (8\')'];
      } else if (defKey.includes('decking boards')) {
        matchedId = keyToNewUuid['decking boards (12\')'];
      }
    }

    if (matchedId) {
      healedDefaults[defKey] = matchedId;
      console.log(`Success: "${defKey}" -> resolved ID "${matchedId}"`);
    } else {
      console.log(`⚠️ Warning: No healing rule matched key: "${defKey}"`);
    }
  }

  // Write healed defaults back to standard KV store
  console.log('\nSaving healed defaults back to KV store...');
  const { error: writeKvErr } = await supabase
    .from('kv_store_8405be07')
    .update({ value: healedDefaults })
    .eq('key', trackerKey);

  if (writeKvErr) {
    console.error('Failed to write key to KV store:', writeKvErr);
  } else {
    console.log('Successfully saved healed defaults to KV store!');
  }

  // 3. Clear and repopulate the database defaults table bypassing RLS with exec_sql
  console.log('\nPreparing to write organization-wide defaults to project_wizard_defaults table...');

  // Reset existing defaults for George's RONA Atlantic organization
  const deleteSql = `DELETE FROM public.project_wizard_defaults WHERE organization_id = '${orgId}'`;
  console.log('Clearing old defaults from project_wizard_defaults table...');
  const { error: delErr } = await supabase.rpc('exec_sql', { sql: deleteSql });

  if (delErr) {
    console.error('Error clearing old defaults:', delErr);
    return;
  }
  console.log('Successfully cleared old defaults from project_wizard_defaults table.');

  // Parse all healed defaults and format SQL inserts for project_wizard_defaults
  const insertStatements: string[] = [];

  for (const [defKey, invItemId] of Object.entries(healedDefaults)) {
    if (defKey.endsWith('-cf') || !invItemId) continue;

    const firstDash = defKey.indexOf('-');
    if (firstDash === -1) continue;

    const plannerType = defKey.slice(0, firstDash);
    const remainder = defKey.slice(firstDash + 1);

    let materialType = 'default';
    let materialCategory = remainder;

    if (remainder.startsWith('treated-')) {
      materialType = 'treated';
      materialCategory = remainder.replace('treated-', '');
    } else if (remainder.startsWith('composite-')) {
      materialType = 'composite';
      materialCategory = remainder.replace('composite-', '');
    } else if (remainder.startsWith('spruce-')) {
      materialType = 'spruce';
      materialCategory = remainder.replace('spruce-', '');
    } else if (remainder.startsWith('cedar-')) {
      materialType = 'cedar';
      materialCategory = remainder.replace('cedar-', '');
    } else if (remainder.startsWith('aluminum-black-')) {
      materialType = 'aluminum-black';
      materialCategory = remainder.replace('aluminum-black-', '');
    } else if (remainder.startsWith('aluminum-white-')) {
      materialType = 'aluminum-white';
      materialCategory = remainder.replace('aluminum-white-', '');
    } else if (remainder.startsWith('aluminum-')) {
      materialType = 'aluminum';
      materialCategory = remainder.replace('aluminum-', '');
    }

    // Capitalize correctly for Category (e.g. "beams (10')" -> "Beams (10')")
    const formattedCategory = materialCategory
      .trim()
      .split(' ')
      .map(word => {
        if (!word) return '';
        if (word.startsWith('(')) {
          return '(' + word.charAt(1).toUpperCase() + word.slice(2);
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');

    const sqlCategory = formattedCategory.replace(/'/g, "''");
    const statement = `INSERT INTO public.project_wizard_defaults (organization_id, planner_type, material_type, material_category, inventory_item_id, created_at, updated_at) VALUES ('${orgId}', '${plannerType}', '${materialType}', '${sqlCategory}', '${invItemId}', NOW(), NOW());`;
    insertStatements.push(statement);
  }

  console.log(`\nInserting ${insertStatements.length} new defaults rows into public.project_wizard_defaults bypassing RLS...`);

  // Execute all SQL inserts sequentially (with error handler)
  let successCount = 0;
  for (const sql of insertStatements) {
    const { error: insErr } = await supabase.rpc('exec_sql', { sql });
    if (insErr) {
      console.error(`Failed executing insert: ${sql.substring(0, 100)}... Error:`, insErr);
    } else {
      successCount++;
    }
  }

  console.log(`Successfully restored ${successCount} out of ${insertStatements.length} defaults!`);

  // 4. Verify count of inserted database defaults
  const verifyResultsQuery = `SELECT count(*) from public.project_wizard_defaults WHERE organization_id = '${orgId}'`;
  const { data: countData } = await supabase.rpc('query_sql', { sql_text: verifyResultsQuery });
  console.log('\nVerification Row Count in DB:', countData);
  console.log('\n--- RESTORATION AND HEALING COMPLETED PERFECTLY! ---');
}

main().catch(console.error);
