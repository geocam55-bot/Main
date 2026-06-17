import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

  console.log('Querying inventory items related to aluminum, screws, glass, etc...');

  // 1. Fetch ALL aluminum railing items
  const { data: aluminum, error: alErr } = await supabase
    .from('inventory')
    .select('id, sku, description, name')
    .eq('organization_id', orgId)
    .or('description.ilike.%aluminum%,description.ilike.%picket%,description.ilike.%glass%,description.ilike.%rail%,description.ilike.%post%');

  if (alErr) {
    console.error('Error:', alErr.message);
    return;
  }

  console.log(`\nFound ${aluminum?.length} potential aluminum/rail/glass/post items.`);

  // Print list of matching rails
  const rails = aluminum.filter(it => it.description.toLowerCase().includes('rail'));
  console.log('\n--- RAILS ---');
  rails.slice(0, 15).forEach(it => console.log(`${it.sku} | ${it.id} | ${it.description.replace(/\n/g, ' ')}`));

  // Print list of matching posts
  const posts = aluminum.filter(it => it.description.toLowerCase().includes('post') || it.description.toLowerCase().includes('cap'));
  console.log('\n--- POSTS ---');
  posts.slice(0, 15).forEach(it => console.log(`${it.sku} | ${it.id} | ${it.description.replace(/\n/g, ' ')}`));

  // Print list of matching pickets
  const pickets = aluminum.filter(it => it.description.toLowerCase().includes('picket'));
  console.log('\n--- PICKETS ---');
  pickets.slice(0, 15).forEach(it => console.log(`${it.sku} | ${it.id} | ${it.description.replace(/\n/g, ' ')}`));

  // Print glass
  const glasses = aluminum.filter(it => it.description.toLowerCase().includes('glass'));
  console.log('\n--- GLASS PANELS ---');
  glasses.slice(0, 30).forEach(it => console.log(`${it.sku} | ${it.id} | ${it.description.replace(/\n/g, ' ')}`));

  // 2. Fetch screws and flashing
  const { data: screws, error: scErr } = await supabase
    .from('inventory')
    .select('id, sku, description, name')
    .eq('organization_id', orgId)
    .or('description.ilike.%screw%,description.ilike.%lag%,description.ilike.%flashing%');

  if (screws) {
    console.log(`\nFound ${screws.length} screw/flashing/lag items.`);
    
    // Lag screws
    const lags = screws.filter(it => it.description.toLowerCase().includes('lag'));
    console.log('\n--- LAG SCREWS ---');
    lags.slice(0, 15).forEach(it => console.log(`${it.sku} | ${it.id} | ${it.description.replace(/\n/g, ' ')}`));

    // Deck screws
    const decks = screws.filter(it => it.description.toLowerCase().includes('deck'));
    console.log('\n--- DECK SCREWS ---');
    decks.slice(0, 15).forEach(it => console.log(`${it.sku} | ${it.id} | ${it.description.replace(/\n/g, ' ')}`));

    // Flashing
    const flashings = screws.filter(it => it.description.toLowerCase().includes('flashing'));
    console.log('\n--- FLASHING ---');
    flashings.slice(0, 15).forEach(it => console.log(`${it.sku} | ${it.id} | ${it.description.replace(/\n/g, ' ')}`));
  }
}

main().catch(console.error);
