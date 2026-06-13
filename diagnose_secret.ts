import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', 'secrets:microsoft')
    .maybeSingle();

  const envSecret = process.env.AZURE_CLIENT_SECRET;

  console.log('--- ENVIROMENT SECRET ANALYTICS ---');
  if (!envSecret) {
    console.log('No AZURE_CLIENT_SECRET found in process.env');
  } else {
    analyzeString('envSecret', envSecret);
  }

  console.log('\n--- DATABASE SECRET ANALYTICS ---');
  if (!data || !data.value || !data.value.clientSecret) {
    console.log('No clientSecret found in database (secrets:microsoft)');
  } else {
    analyzeString('dbSecret', data.value.clientSecret);
  }
}

function analyzeString(name: string, str: string) {
  console.log(`Analyzing: ${name}`);
  console.log(`- Exact length: ${str.length}`);
  console.log(`- Has leading space: ${str.startsWith(' ')}`);
  console.log(`- Has trailing space: ${str.endsWith(' ')}`);
  console.log(`- Has leading double quote: ${str.startsWith('"')}`);
  console.log(`- Has trailing double quote: ${str.endsWith('"')}`);
  console.log(`- Has leading single quote: ${str.startsWith("'")}`);
  console.log(`- Has trailing single quote: ${str.endsWith("'")}`);
  console.log(`- Has carriage return (\\r): ${str.includes('\r')}`);
  console.log(`- Has newline (\\n): ${str.includes('\n')}`);
  console.log(`- Character codes: ${Array.from(str).map(c => c.charCodeAt(0)).join(', ')}`);
}

main().catch(console.error);
