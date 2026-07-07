import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

  // 1. Let's define the SKUs we know from logs or patterns
  const knownSkus = {
    // Beams (2x8 PT Brown)
    "deck-treated-beams": "84895031", // 10'
    "deck-treated-beams (8')": "84895030",
    "deck-treated-beams (10')": "84895031",
    "deck-treated-beams (12')": "84895032",
    "deck-treated-beams (14')": "84895033",
    "deck-treated-beams (16')": "84895034",
    
    // Joists (Same as beams, 2x8 PT Brown)
    "deck-treated-joists": "84895031",
    "deck-treated-joists (8')": "84895030",
    "deck-treated-joists (10')": "84895031",
    "deck-treated-joists (12')": "84895032",
    "deck-treated-joists (14')": "84895033",
    "deck-treated-joists (16')": "84895034",

    // Rim Joists (Same as beams, 2x8 PT Brown)
    "deck-treated-rim joists": "84895031",
    "deck-treated-rim joists (8')": "84895030",
    "deck-treated-rim joists (10')": "84895031",
    "deck-treated-rim joists (12')": "84895032",
    "deck-treated-rim joists (14')": "84895033",
    "deck-treated-rim joists (16')": "84895034",

    // Ledger board (Same 2x8 PT Brown)
    "deck-treated-ledger board": "84895031",
    "deck-treated-ledger board (8')": "84895030",
    "deck-treated-ledger board (10')": "84895031",
    "deck-treated-ledger board (12')": "84895032",
    "deck-treated-ledger board (14')": "84895033",
    "deck-treated-ledger board (16')": "84895034",

    // Posts (6x6 PT Brown D4S)
    "deck-treated-posts": "84895046", // 8' length
    "deck-treated-posts (8')": "84895046",
    "deck-treated-posts (10')": "84895047", // 10'
    "deck-treated-posts (12')": "84895048", // 12'
    "deck-treated-posts (14')": "84895049", // 14', if present
    "deck-treated-posts (16')": "84895050", // 16'

    // Decking boards (5/4x6 Treated Decking)
    "deck-treated-decking boards": "84895018", // 12' generic
    "deck-treated-decking boards (8')": "84895016",
    "deck-treated-decking boards (10')": "84895017",
    "deck-treated-decking boards (12')": "84895018",
    "deck-treated-decking boards (14')": "84895019",
    "deck-treated-decking boards (16')": "84895020",

    // Stair Stringers (2x12 PT Brown)
    "deck-treated-stair stringers": "84895040", // 12' length (for 2x12x12)

    // Hardware and other known items
    "deck-treated-lag screws": "1399886",
    "deck-treated-deck screws": "13997876",
    "deck-treated-concrete mix": "0533008",
    "deck-treated-post anchors": "35945128",
    "deck-treated-stair treads": "39595063",
    "deck-treated-joist hangers": "35945339",
    "deck-treated-railing posts": "84895043", // 4x4x8 PT Brown
    "deck-treated-ledger flashing": "MMS449748",
    "deck-treated-railing top rail": "84895026", // PT BROWN 2x6x8
    "deck-treated-railing bottom rail": "84895026", // PT BROWN 2x6x8
    "deck-treated-railing balusters": "51206852" // Baluster
  };

  console.log('Querying current inventory matches for specified SKUs...');
  const skusToQuery = Array.from(new Set(Object.values(knownSkus)));

  // Batch query inventory
  const { data: matchedItems, error } = await supabase
    .from('inventory')
    .select('id, name, description, sku')
    .eq('organization_id', orgId)
    .in('sku', skusToQuery);

  if (error) {
    console.error('Error fetching by SKUs:', error.message);
    return;
  }

  console.log(`Successfully matched ${matchedItems?.length} items by exact SKU.`);
  console.log('Matched items list:', JSON.stringify(matchedItems, null, 2));

  // Let's check for any missing SKUs (e.g. 14' posts)
  const foundSkus = (matchedItems || []).map(it => String(it.sku));
  const missingSkus = skusToQuery.filter(sku => !foundSkus.includes(sku));

  if (missingSkus.length > 0) {
    console.log('\nSKUs not found in inventory:', missingSkus);
    
    // Let's do a fuzzy search for description like "6X6" and find all SKUs for posts
    const { data: posts } = await supabase
      .from('inventory')
      .select('id, sku, description')
      .eq('organization_id', orgId)
      .ilike('description', '%6X6%')
      .ilike('description', '%PT BROWN%');

    console.log('\nAvailable 6X6 PT Posts in active database:');
    console.log(JSON.stringify(posts, null, 2));
  }
}

main().catch(console.error);
