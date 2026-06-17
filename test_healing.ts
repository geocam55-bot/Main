import { createClient } from './src/utils/supabase/client';

// Simple parser for defaults keys
function getSearchTerms(key: string): { terms: string[], length?: number } {
  const parts = key.toLowerCase().split('-');
  const planner = parts[0]; // e.g. deck
  const material = parts[1]; // e.g. treated, aluminum
  
  let rest = parts.slice(2).join('-'); // e.g. "beams (10')", "black-black picket (6')"
  
  // Extract length if present
  let length: number | undefined;
  const lenMatch = rest.match(/\((\d+)'\)/);
  if (lenMatch) {
    length = parseInt(lenMatch[1], 10);
  }
  
  // Extract glass size if present, e.g. tempered glass panel (24")
  let glassSize: number | undefined;
  const glassMatch = rest.match(/\((\d+)"\)/);
  if (glassMatch) {
    glassSize = parseInt(glassMatch[1], 10);
  }

  const terms: string[] = [];
  
  if (material === 'treated') {
    terms.push('pt', 'brown');
  } else if (material === 'aluminum') {
    terms.push('aluminium', 'aluminum');
  }

  // Add specific keywords based on category
  if (rest.includes('ledger board') || rest.includes('ledger')) {
    terms.push('ledger');
  } else if (rest.includes('rim joist')) {
    terms.push('rim', 'joist');
  } else if (rest.includes('joist hanger')) {
    terms.push('hanger');
  } else if (rest.includes('joist')) {
    terms.push('joist');
  } else if (rest.includes('beams') || rest.includes('beam')) {
    terms.push('2x8'); // standard treated beam
  } else if (rest.includes('post anchor')) {
    terms.push('anchor');
  } else if (rest.includes('posts') || rest.includes('post')) {
    if (material === 'treated') {
      terms.push('4x4');
    } else {
      terms.push('post');
    }
  } else if (rest.includes('decking boards') || rest.includes('decking')) {
    terms.push('5/4x6'); // standard decking
  } else if (rest.includes('stair treads') || rest.includes('tread')) {
    terms.push('tread');
  } else if (rest.includes('stair stringers') || rest.includes('stringer')) {
    terms.push('stringer');
  } else if (rest.includes('top rail')) {
    terms.push('top', 'rail');
  } else if (rest.includes('bottom rail')) {
    terms.push('bottom', 'rail');
  } else if (rest.includes('baluster') || rest.includes('balusters')) {
    terms.push('baluster');
  } else if (rest.includes('deck screws') || rest.includes('deck screw')) {
    terms.push('screw', 'deck');
  } else if (rest.includes('structural screws') || rest.includes('structural screw')) {
    terms.push('structural');
  } else if (rest.includes('lag screws') || rest.includes('lag screw')) {
    terms.push('lag');
  } else if (rest.includes('concrete mix') || rest.includes('concrete')) {
    terms.push('concrete', 'mix');
  } else if (rest.includes('ledger flashing') || rest.includes('flashing')) {
    terms.push('flashing');
  } else if (rest.includes('glass panel') || rest.includes('glass')) {
    terms.push('glass', 'panel');
    if (glassSize) {
      terms.push(`${glassSize}`);
    }
  } else if (rest.includes('picket')) {
    terms.push('picket');
  }

  // Handle color / rail types
  if (key.includes('black')) {
    terms.push('black');
  }
  if (key.includes('white')) {
    terms.push('white');
  }

  return { terms, length };
}

async function main() {
  const supabase = createClient();
  const dbKey = 'user_planner_defaults:34638283-7b3d-47e2-bec8-a9e600e28c4a:59634269-20bb-4759-8bcf-6f5002d69eef';

  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', dbKey)
    .maybeSingle();

  if (error || !data?.value) {
    console.error('Failed to load defaults:', error);
    return;
  }

  const defaults = { ...data.value };
  
  // Load ALL current inventory items for our organization
  const { data: invItems, error: invErr } = await supabase
    .from('inventory')
    .select('id, name, description, sku')
    .eq('organization_id', '34638283-7b3d-47e2-bec8-a9e600e28c4a');

  if (invErr || !invItems) {
    console.error('Failed to load inventory items:', invErr);
    return;
  }

  console.log(`Loaded ${invItems.length} inventory items.`);

  const healedDefaults: Record<string, string> = {};
  const unresolved: string[] = [];

  for (const [defKey, oldId] of Object.entries(defaults)) {
    if (!oldId || typeof oldId !== 'string' || defKey.endsWith('-cf')) {
      healedDefaults[defKey] = oldId;
      continue;
    }

    const { terms, length } = getSearchTerms(defKey);
    
    // Score each inventory item based on search terms and length
    let bestMatch: any = null;
    let bestScore = -999;

    for (const item of invItems) {
      const desc = (item.description || '').toLowerCase();
      const sku = (item.sku || '').toLowerCase();
      
      let score = 0;
      
      // Terms match
      let termMatches = 0;
      terms.forEach(term => {
        if (desc.includes(term.toLowerCase())) {
          score += 10;
          termMatches++;
        }
      });

      // Require at least 1 term match or 50% term matches for building materials
      if (termMatches === 0 && terms.length > 0) continue;

      // Match length if specified
      if (length != null) {
        // e.g. "X10'" or "X10 " or "X10\n"
        const lenPattern = new RegExp(`X${length}'`);
        const lenPatternAlt = new RegExp(`${length}ft`);
        const lenPatternAlt2 = new RegExp(` ${length}'`);
        
        if (lenPattern.test(desc) || lenPatternAlt.test(desc) || lenPatternAlt2.test(desc)) {
          score += 30;
        } else {
          score -= 15;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    if (bestMatch && bestScore > 0) {
      healedDefaults[defKey] = bestMatch.id;
      console.log(`Matched key [${defKey}] (Old ID: ${oldId.slice(0, 8)}) -> [${bestMatch.description.split('\n')[0]}] (New ID: ${bestMatch.id.slice(0, 8)}, Score: ${bestScore})`);
    } else {
      unresolved.push(defKey);
      healedDefaults[defKey] = oldId; // keep old as fallback
    }
  }

  console.log(`Matched: ${Object.keys(defaults).length - unresolved.length} / ${Object.keys(defaults).length}`);
  console.log(`Unresolved keys:`, unresolved);
}

main().catch(console.error);
